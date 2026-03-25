/**
 * tests/e2e_tests/smoke/auth.smoke.cy.ts
 *
 * Быстрые smoke-проверки только для обязательных сценариев:
 * 1) Пользователь может зарегистрироваться
 * 2) Пользователь видит ошибку при неверном пароле
 */

describe('Smoke: обязательные сценарии аутентификации', () => {
  let users: {
    validUser: { fullName: string; email: string; password: string };
  };

  before(() => {
    cy.fixture('auth').then((data) => {
      users = data;
    });
  });

  it('SMK-AUTH-01: Пользователь может зарегистрироваться', () => {
    cy.intercept('POST', '**/auth/v1/signup', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          user: {
            id: 'smoke-user-id-1',
            email: req.body.email,
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
    cy.fillSignUpForm(
      users.validUser.fullName,
      users.validUser.email,
      users.validUser.password,
    );

    cy.wait('@signupRequest').its('response.statusCode').should('eq', 200);
    cy.wait('@createProfile').its('response.statusCode').should('eq', 201);
    cy.contains('Аккаунт создан').should('be.visible');
  });

  it('SMK-AUTH-02: Пользователь видит ошибку при неверном пароле', () => {
    cy.intercept('POST', '**/auth/v1/token?grant_type=password', {
      statusCode: 400,
      body: {
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
      },
    }).as('loginRequest');

    cy.visit('/auth');
    cy.fillLoginForm(users.validUser.email, 'wrongPassword!');

    cy.wait('@loginRequest').its('response.statusCode').should('eq', 400);
    cy.contains('Invalid login credentials').should('be.visible');
    cy.url().should('include', '/auth');
  });
});
