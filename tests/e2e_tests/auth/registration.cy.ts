/**
 * tests/e2e_tests/auth/registration.cy.ts
 *
 * E2E-тесты сценария «Регистрация пользователя»
 */

describe('Регистрация пользователя', () => {
  let users: {
    validUser: { fullName: string; email: string; password: string };
    existingUser: { email: string; password: string };
    weakPassword: { email: string; password: string };
  };

  before(() => {
    cy.fixture('auth').then((data) => {
      users = data;
    });
  });

  beforeEach(() => {
    cy.intercept('POST', '**/auth/v1/signup', (req) => {
      const { email } = req.body;

      if (email === 'existing@example.com') {
        req.reply({
          statusCode: 422,
          body: {
            error: 'User already registered',
            error_description: 'User already registered',
          },
        });
        return;
      }

      req.reply({
        statusCode: 200,
        body: {
          user: {
            id: 'fake-user-id-123',
            email,
            role: 'authenticated',
            created_at: new Date().toISOString(),
          },
          session: null,
        },
      });
    }).as('signupRequest');

    cy.intercept('POST', '**/rest/v1/users_profile', {
      statusCode: 201,
      body: {},
    }).as('createProfile');

    cy.goToSignUp();
  });

  it('SC-REG-01: Пользователь может зарегистрироваться', () => {
    cy.fillSignUpForm(
      users.validUser.fullName,
      users.validUser.email,
      users.validUser.password,
    );

    cy.wait('@signupRequest');
    cy.wait('@createProfile');
    cy.contains('Аккаунт создан').should('be.visible');
  });

  it('SC-REG-02: Система показывает ошибку если email уже занят', () => {
    cy.fillSignUpForm(
      'Другой Пользователь',
      users.existingUser.email,
      'ValidPass123!',
    );

    cy.wait('@signupRequest');
    cy.get('[class*="red"]').should('be.visible');
    cy.contains('User already registered').should('be.visible');
  });

  it('SC-REG-03: Форма не отправляется при пустых полях', () => {
    cy.get('button[type="submit"]').click();
    cy.get('@signupRequest.all').should('have.length', 0);
  });

  it('SC-REG-04: Страница регистрации содержит все нужные поля', () => {
    cy.get('input[placeholder="Иван Иванов"]').should('be.visible');
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Создать аккаунт');
    cy.contains('Войти').should('be.visible');
  });

  it('SC-REG-05: Можно вернуться к форме входа', () => {
    cy.contains('button', 'Войти').click();
    cy.get('button[type="submit"]').should('contain', 'Войти');
    cy.get('input[placeholder="Иван Иванов"]').should('not.exist');
  });
});
