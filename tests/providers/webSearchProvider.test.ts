import { WebSearchProvider } from '../../providers/webSearchProvider';

describe('WebSearchProvider', () => {
    let provider: WebSearchProvider;

    beforeEach(() => {
        provider = new WebSearchProvider();
    });

    it('should fetch search results based on query', async () => {
        const query = 'latest market trends';
        const results = await provider.search(query);
        expect(results).toBeDefined();
        expect(results.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
        const query = 'invalid query that causes error';
        await expect(provider.search(query)).rejects.toThrow();
    });

    it('should return results in expected format', async () => {
        const query = 'startup funding news';
        const results = await provider.search(query);
        expect(results).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: expect.any(String),
                    link: expect.any(String),
                    snippet: expect.any(String),
                }),
            ])
        );
    });
});