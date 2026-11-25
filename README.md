# Clothify

[![CI](https://github.com/flyingllama1/clothify-lab3/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/flyingllama1/clothify-lab3/actions/workflows/ci.yml)

Интернет-магазин на React, Express и MongoDB. Проект для лабораторной работы № 3 по тестированию. Исходный магазин и логотип принадлежат автору Edgistify Assignment. Фото товаров для тестового каталога взяты из DummyJSON. [Исходный проект](https://github.com/Sajid788/edgistify-Assignment/tree/1f0a32adea63c9e5a06c8f6e736491db6b61ae61) · [DummyJSON](https://dummyjson.com/docs/products)

## Локальный запуск

Нужны Node.js 22, npm и Docker. Команды выполняются из каталога с этим README.

```bash
npm ci
npm --prefix backend ci
npm --prefix frontend ci
npx playwright install chromium

docker run -d --rm --name clothify-mongo -p 127.0.0.1:27019:27017 mongo:7.0
docker exec clothify-mongo mongosh --quiet --eval 'db.adminCommand({ping:1}).ok'
```

Повторите последнюю команду, если MongoDB ещё запускается. На Ubuntu при отсутствии системных библиотек для браузера используйте `npx playwright install --with-deps chromium`.

```bash
npm run lint
npm run test:unit
npm run security
MONGO_URI=mongodb://127.0.0.1:27019/clothify_integration npm run test:integration
npm run test:e2e
npm run build
```

Playwright сам загружает тестовые товары в `clothify_e2e` и запускает API и интерфейс. Интеграционные тесты создают отдельную базу на каждый прогон и удаляют её при завершении. HTML-отчёт покрытия находится в `coverage/index.html`. HTML-отчёт браузерных тестов открывается командой `npx playwright show-report`.

Для ручной проверки магазина запустите API и фронтенд в разных терминалах. В PowerShell переменные задаются через `$env:ИМЯ = "значение"`.

```bash
export MONGO_URI=mongodb://127.0.0.1:27019/clothify_local
export JWT_SECRET="$(node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))')"
node scripts/seed.cjs
npm --prefix backend start
```

```bash
npm --prefix frontend run dev
```

Откройте адрес, который напечатает Vite. Когда MongoDB больше не нужна, выполните `docker stop clothify-mongo`.

## GitHub Actions

Workflow [ci.yml](.github/workflows/ci.yml) запускается на каждом `push` и `pull_request`. После успешных `unit` и `security` выполняются `integration → e2e → build`. На успешном push в `main` job `release` упаковывает backend и собранный фронтенд. Для развёртывания распакуйте архив, установите зависимости backend через `npm ci --omit=dev`, задайте `MONGO_URI` и `JWT_SECRET` для сервера и настройте раздачу каталога `public` с проксированием `/api` на backend и подстановкой `index.html` для маршрутов React.

| Артефакт | Содержимое |
| --- | --- |
| `unit-and-coverage` | Unit JUnit XML и покрытие HTML, LCOV, JSON |
| `security-audit` | npm audit для трёх lock-файлов |
| `integration-junit` | Integration JUnit XML |
| `playwright-results` | HTML, XML и файлы диагностики Playwright |
| `frontend-build` | Собранный frontend |
| `clothify-release` | Архив frontend и backend после успешного push в `main` |
