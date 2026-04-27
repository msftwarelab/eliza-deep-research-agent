import { performMarketResearch } from '../../actions/marketResearch';

describe('Market Research Action', () => {
    it('should return valid market research results for given parameters', async () => {
        const params = {
            industry: 'Technology',
            region: 'North America',
            timeframe: '2023',
        };

        const results = await performMarketResearch(params);
        
        expect(results).toBeDefined();
        expect(results).toHaveProperty('insights');
        expect(results.insights).toBeInstanceOf(Array);
        expect(results.insights.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
        const params = {
            industry: 'InvalidIndustry',
            region: 'UnknownRegion',
            timeframe: '2023',
        };

        await expect(performMarketResearch(params)).rejects.toThrow('Invalid parameters');
    });
});