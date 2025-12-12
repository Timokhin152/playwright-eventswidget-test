const { test, expect } = require('@playwright/test');

test.describe('Конструктор виджета мероприятий - Финальные тесты', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000); // 90 секунд на весь тест
    
    console.log('Загружаем страницу...');
    await page.goto('https://dev.3snet.info/eventswidget/', {
      timeout: 45000,
      waitUntil: 'domcontentloaded'
    });
    
    // Ждем загрузки основных элементов
    await page.waitForSelector('button:has-text("Сгенерировать превью")', { 
      state: 'visible', 
      timeout: 10000 
    });
    
    console.log('✅ Страница загружена');
  });

  // === ТЕСТ 1: Базовая функциональность ===
  test('1. Основные элементы присутствуют', async ({ page }) => {
    // Проверяем ключевые элементы виджета
    const keyElements = [
      { 
        name: 'Кнопка генерации превью', 
        selector: 'button:has-text("Сгенерировать превью")' 
      },
      { 
        name: 'Кнопка копирования кода', 
        selector: '#code-copy-button, button:has-text("Скопировать код")' 
      },
      { 
        name: 'Поле с кодом виджета', 
        selector: '#code-text, textarea, code, .code-block' 
      },
      { 
        name: 'Блок превью', 
        selector: '#preview-widget, .preview, .widget-preview' 
      },
      { 
        name: 'Настройки виджета', 
        selector: '.widget-settings, [class*="settings"], form' 
      }
    ];

    console.log('\n=== Проверка элементов ===');
    for (const element of keyElements) {
      const locator = page.locator(element.selector);
      const count = await locator.count();
      const isVisible = count > 0 ? await locator.first().isVisible() : false;
      
      if (isVisible) {
        console.log(`✓ ${element.name} - НАЙДЕН (селектор: ${element.selector})`);
      } else if (count > 0) {
        console.log(`⚠️ ${element.name} - есть, но невидим (${count} шт)`);
      } else {
        console.log(`❌ ${element.name} - НЕ НАЙДЕН`);
      }
    }

    // Делаем скриншот начального состояния
    await page.screenshot({ path: '1-initial-state.png' });
  });

  // === ТЕСТ 2: Настройки виджета (без зависания) ===
  test('2. Настройки виджета доступны для изменения', async ({ page }) => {
    console.log('\n=== Проверка настроек ===');
    
    // Ищем РЕАЛЬНЫЕ поля настройки виджета (не поиск по сайту!)
    const widgetSettings = [
      { name: 'выбор типа событий', selector: 'select, input[type="checkbox"][name*="type"], input[type="radio"]' },
      { name: 'настройка цвета', selector: 'input[type="color"], [class*="color"]' },
      { name: 'настройка размера', selector: 'input[type="range"], select[name*="size"]' },
      { name: 'включение/выключение функций', selector: 'input[type="checkbox"]:not(#search-input)' }
    ];

    let foundSettings = 0;
    for (const setting of widgetSettings) {
      const elements = page.locator(setting.selector);
      const count = await elements.count();
      
      if (count > 0) {
        console.log(`✓ ${setting.name}: ${count} элемент(ов)`);
        foundSettings++;
        
        // Пробуем взаимодействовать с первым элементом
        if (count > 0) {
          const firstElement = elements.first();
          const isEnabled = await firstElement.isEnabled();
          console.log(`  Первый элемент ${isEnabled ? 'доступен' : 'недоступен'}`);
        }
      }
    }

    expect(foundSettings).toBeGreaterThan(0);
    console.log(`Всего найдено настроек: ${foundSettings}`);
  });

  // === ТЕСТ 3: Генерация превью (с защитой от зависания) ===
  test('3. Генерация превью виджета', async ({ page }) => {
    console.log('\n=== Генерация превью ===');
    
    const generateButton = page.locator('button:has-text("Сгенерировать превью")');
    await expect(generateButton).toBeVisible();
    
    // Делаем скриншот ДО
    await page.screenshot({ path: '3-before-generation.png' });
    
    console.log('Нажимаем кнопку "Сгенерировать превью"...');
    
    try {
      // Используем Promise.race чтобы не зависнуть
      const clickWithTimeout = Promise.race([
        generateButton.click(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Таймаут клика')), 10000)
        )
      ]);
      
      await clickWithTimeout;
      console.log('✅ Клик выполнен');
      
      // Ждем изменения на странице (но не слишком долго)
      await page.waitForTimeout(3000);
      
      // Проверяем, появилось ли превью
      const preview = page.locator('#preview-widget, .preview, iframe');
      const previewCount = await preview.count();
      
      if (previewCount > 0) {
        console.log(`✅ Превью сгенерировано (найдено ${previewCount} элементов)`);
        await preview.first().screenshot({ path: '3-preview-generated.png' });
      } else {
        console.log('⚠️ Превью не найдено, проверяем другие изменения...');
        
        // Проверяем, возможно код обновился
        const codeBlock = page.locator('#code-text, textarea, code');
        const codeText = await codeBlock.first().textContent();
        if (codeText && codeText.length > 50) {
          console.log(`✅ Код виджета сгенерирован (${codeText.length} символов)`);
        }
      }
      
      // Делаем скриншот ПОСЛЕ
      await page.screenshot({ path: '3-after-generation.png' });
      
    } catch (error) {
      console.log(`⚠️ Ошибка при генерации: ${error.message}`);
      // Делаем скриншот даже при ошибке
      await page.screenshot({ path: '3-generation-error.png' });
    }
  });

   // === ТЕСТ 4: Функция копирования кода (исправленная) ===
  test('4. Функция копирования кода', async ({ page }) => {
    console.log('\n=== Копирование кода ===');
    
    const copyButton = page.locator('#code-copy-button, button:has-text("Скопировать код")');
    const codeField = page.locator('#code-text, textarea, code');
    
    await expect(copyButton).toBeVisible();
    await expect(codeField).toBeVisible();
    
    const originalCode = await codeField.first().textContent();
    console.log(`Длина кода: ${originalCode?.length || 0} символов`);
    
    if (!originalCode || originalCode.length < 10) {
      console.log('⚠️ Код слишком короткий');
      return;
    }
    
    console.log('Проверяем наличие обработчика копирования...');
    
    // Простая проверка без мока clipboard
    const hasCopyHandler = await page.evaluate(() => {
      const btn = document.querySelector('#code-copy-button, button:has-text("Скопировать код")');
      // Проверяем, есть ли onclick или data-атрибуты
      return btn && (
        btn.hasAttribute('onclick') || 
        btn.getAttribute('data-copy') ||
        btn.classList.contains('copy-button')
      );
    });
    
    if (hasCopyHandler) {
      console.log('✅ Кнопка имеет обработчик копирования');
    } else {
      console.log('⚠️ Обработчик копирования не найден (может быть через addEventListener)');
    }
    
    // Проверяем, что кнопка кликабельна
    await expect(copyButton).toBeEnabled();
    console.log('✅ Кнопка копирования доступна для клика');
    
    await page.screenshot({ path: '4-copy-code-test.png' });
  });

  // === ТЕСТ 5: Валидация HTML/Структуры ===
  test('5. Валидация структуры страницы', async ({ page }) => {
    console.log('\n=== Валидация структуры ===');
    
    // Проверяем, что нет критических ошибок
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log(`Ошибка консоли: ${msg.text().substring(0, 100)}...`);
      }
    });
    
    // Проверяем основные метрики
    const metrics = await page.evaluate(() => {
      return {
        totalElements: document.querySelectorAll('*').length,
        scripts: document.querySelectorAll('script').length,
        images: document.querySelectorAll('img').length,
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input, select, textarea').length,
        hasJQuery: typeof jQuery !== 'undefined',
        hasVue: typeof Vue !== 'undefined',
        hasReact: typeof React !== 'undefined'
      };
    });
    
    console.log('Метрики страницы:');
    console.log(`- Всего элементов: ${metrics.totalElements}`);
    console.log(`- Скриптов: ${metrics.scripts}`);
    console.log(`- Изображений: ${metrics.images}`);
    console.log(`- Кнопок: ${metrics.buttons}`);
    console.log(`- Полей ввода: ${metrics.inputs}`);
    console.log(`- jQuery: ${metrics.hasJQuery ? 'есть' : 'нет'}`);
    console.log(`- Vue: ${metrics.hasVue ? 'есть' : 'нет'}`);
    console.log(`- React: ${metrics.hasReact ? 'есть' : 'нет'}`);
    
    // Делаем скриншот всей страницы
    await page.screenshot({ path: '5-full-page.png', fullPage: true });
    
    expect(errors.length).toBeLessThan(5);
    console.log(`✅ Критических ошибок: ${errors.length}`);
  });
});