export interface TestPaymentScenario {
    alias: string;
    description: string;
    paymentMethod: string;
}
export declare const TEST_PAYMENT_SCENARIOS: Record<string, TestPaymentScenario>;
export declare function getTestPaymentScenario(alias: string): TestPaymentScenario | undefined;
export declare function listTestPaymentScenarios(): TestPaymentScenario[];
//# sourceMappingURL=test-scenarios.d.ts.map