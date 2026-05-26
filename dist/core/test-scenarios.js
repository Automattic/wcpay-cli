export const TEST_PAYMENT_SCENARIOS = {
    success: {
        alias: 'success',
        description: 'Successful Visa card payment.',
        paymentMethod: 'pm_card_visa',
    },
    decline: {
        alias: 'decline',
        description: 'Generic declined card payment.',
        paymentMethod: 'pm_card_chargeDeclined',
    },
    '3ds': {
        alias: '3ds',
        description: 'Payment requiring 3D Secure authentication.',
        paymentMethod: 'pm_card_authenticationRequired',
    },
    fraudulent: {
        alias: 'fraudulent',
        description: 'Fraudulent card payment scenario.',
        paymentMethod: 'pm_card_chargeDeclinedFraudulent',
    },
    dispute: {
        alias: 'dispute',
        description: 'Dispute-oriented test scenario. Exact dispute creation depends on downstream Stripe/WooPayments support.',
        paymentMethod: 'pm_card_createDispute',
    },
};
export function getTestPaymentScenario(alias) {
    return TEST_PAYMENT_SCENARIOS[alias];
}
export function listTestPaymentScenarios() {
    return Object.values(TEST_PAYMENT_SCENARIOS);
}
//# sourceMappingURL=test-scenarios.js.map