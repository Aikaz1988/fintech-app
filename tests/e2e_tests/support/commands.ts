/**
 * tests/e2e_tests/support/commands.ts
 *
 * Кастомные команды Cypress, доступные во всех тестах через cy.*.
 */

declare global {
  namespace Cypress {
    interface Chainable {
      goToSignUp(): Chainable<void>;
      fillSignUpForm(fullName: string, email: string, password: string): Chainable<void>;
      fillLoginForm(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('goToSignUp', () => {
  cy.visit('/auth');
  cy.contains('button', 'Зарегистрироваться').click();
});

Cypress.Commands.add('fillSignUpForm', (fullName, email, password) => {
  cy.get('input[placeholder="Иван Иванов"]').clear().type(fullName);
  cy.get('input[type="email"]').clear().type(email);
  cy.get('input[type="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
});

Cypress.Commands.add('fillLoginForm', (email, password) => {
  cy.get('input[type="email"]').clear().type(email);
  cy.get('input[type="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
});

export {};
