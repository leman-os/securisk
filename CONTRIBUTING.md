# Contributing to SecuRisk

Спасибо за интерес к проекту SecuRisk!

## Как внести вклад

### Сообщение об ошибках

1. Проверьте, что проблема еще не сообщена в Issues
2. Создайте новый Issue с подробным описанием:
   - Версия SecuRisk
   - Шаги для воспроизведения
   - Ожидаемое поведение
   - Фактическое поведение
   - Логи (если есть)

### Предложение новых функций

1. Создайте Issue с описанием функции
2. Опишите use case
3. Дождитесь обсуждения и одобрения

### Pull Requests

1. Fork репозитория
2. Создайте ветку для вашей функции:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Внесите изменения
4. Протестируйте изменения
5. Commit изменений:
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. Push в вашу ветку:
   ```bash
   git push origin feature/amazing-feature
   ```
7. Создайте Pull Request

## Стандарты кода

### Python (Backend)
- Следуйте PEP 8
- Используйте type hints
- Документируйте функции с помощью docstrings
- Пишите тесты для новых функций

### JavaScript/React (Frontend)
- Используйте ESLint
- Следуйте React best practices
- Используйте функциональные компоненты и hooks
- Пишите понятные названия компонентов и функций

### Commits
- Используйте осмысленные сообщения коммитов
- Формат: `type(scope): description`
- Типы: feat, fix, docs, style, refactor, test, chore

Пример:
```
feat(incidents): add MTTA metric calculation
fix(auth): correct JWT token validation
docs(readme): update installation instructions
```

## Тестирование

Перед созданием Pull Request:

```bash
# Backend тесты
cd backend
pytest

# Frontend тесты
cd frontend
yarn test

# Docker сборка
docker-compose build
docker-compose up -d
```

## Код поведения

- Будьте уважительны
- Конструктивная критика приветствуется
- Помогайте другим участникам

## Вопросы?

Если у вас есть вопросы, создайте Issue или свяжитесь с maintainers.

Спасибо за вклад! 🎉
