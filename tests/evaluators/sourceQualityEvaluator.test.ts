import { SourceQualityEvaluator } from '../../src/evaluators/sourceQualityEvaluator';

describe('SourceQualityEvaluator', () => {
    let evaluator: SourceQualityEvaluator;

    beforeEach(() => {
        evaluator = new SourceQualityEvaluator();
    });

    test('should evaluate high-quality source correctly', () => {
        const source = {
            url: 'https://highqualitysource.com',
            credibilityScore: 90,
            citations: 10,
            publicationDate: new Date('2023-01-01'),
        };
        const result = evaluator.evaluate(source);
        expect(result).toBe(true);
    });

    test('should evaluate low-quality source correctly', () => {
        const source = {
            url: 'https://lowqualitysource.com',
            credibilityScore: 30,
            citations: 1,
            publicationDate: new Date('2020-01-01'),
        };
        const result = evaluator.evaluate(source);
        expect(result).toBe(false);
    });

    test('should handle sources with missing data', () => {
        const source = {
            url: 'https://missingdata.com',
            credibilityScore: null,
            citations: 0,
            publicationDate: null,
        };
        const result = evaluator.evaluate(source);
        expect(result).toBe(false);
    });
});