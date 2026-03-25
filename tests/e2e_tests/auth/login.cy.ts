/**
 * tests/e2e_tests/auth/login.cy.ts
 *
 * E2E-тесты сценария «Вход в систему»
 *
 * Покрывает:
 *  - Успешный вход с верными учётными данными
 *  - Ошибка при неверном пароле
 *  - Ошибка при незарегистрированном email
 *  - Ошибка при пустых полях
 *  - Блокировка кнопки во время загрузки
 */

describe('Вход пользователя в систему', () => {
  let users: {
    validUser: { fullName: string; email: string; password: string };
    existingUser: { email: string; password: string };
  };

  before(() => {
    cy.fixture('auth').then((data) => {
      users = data;
    });
  });

  beforeEach(() => {
    // Перехватываем запросы к Supabase Auth token endpoint
    cy.intercept('POST', '**/auth/v1/token?grant_type=password', (req) => {
      const { email, password } = req.body;

      // Верные данные -> успешный вход
      if (email === 'test.user@example.com' && password === 'SecurePass123!') {
        req.reply({
          statusCode: 200,
          body: {
            access_token: 'fake-access-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'fake-refresh-token',
            user: {
              id: 'fake-user-id-123',
              email,
              role: 'authenticated',
            },
          },
        });
        return;
      }

      // Всё остальное -> ошибка
      req.reply({
        statusCode: 400,
        body: {
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        },
      });
    }).as('loginRequest');

    cy.visit('/auth');
  });

  it('SC-LOGIN-01: Пользователь может войти с верными данными', () => {
    cy.fillLoginForm(users.validUser.email, users.validUser.password);

    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
    cy.url().should('not.include', '/auth');
  });

  it('SC-LOGIN-02: Пользователь видит ошибку при неверном пароле', () => {
    cy.fillLoginForm(users.validUser.email, 'wrongPassword!');

    cy.wait('@loginRequest').its('response.statusCode').should('eq', 400);
    cy.get('[class*="red"]').should('be.visible');
    cy.contains('Invalid login credentials').should('be.visible');
    cy.url().should('include', '/auth');
  });

  it('SC-LOGIN-03: Пользователь видит ошибку при несуществующем email', () => {
    cy.fillLoginForm('nobody@unknown.com', 'SomePass123!');

    cy.wait('@loginRequest').its('response.statusCode').should('eq', 400);
    cy.get('[class*="red"]').should('be.visible');
    cy.url().should('include', '/auth');
  });

  it('SC-LOGIN-04: Форма не отправляется при пустых полях', () => {
    cy.get('button[type="submit"]').click();
    cy.get('@loginRequest.all').should('have.length', 0);
  });

  it('SC-LOGIN-05: Кнопка «Войти» недоступна пока идёт запрос', () => {
    cy.intercept('POST', '**/auth/v1/token?grant_type=password', (req) => {
      req.on('response', (res) => {
        res.setDelay(500);
      });
      req.reply({ statusCode: 400, body: { error: 'invalid_grant' } });
    }).as('slowLogin');

    cy.fillLoginForm(users.validUser.email, 'wrong!');
    cy.get('button[type="submit"]').should('be.disabled');

    cy.wait('@slowLogin');
  });

  it('SC-LOGIN-06: Страница входа содержит все нужные элементы', () => {
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Войти');
    cy.contains('FinTrack').should('be.visible');
    cy.contains('Зарегистрироваться').should('be.visible');
  });
});
