/**
 * Semantic Search - Fuzzy matching and relevance ranking
 * Lightweight implementation without external dependencies
 */

class SemanticSearch {
    constructor() {
        this.threshold = 0.6; // Minimum similarity score (0-1)
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = [];

        // Initialize matrix
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        // Fill matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[len1][len2];
    }

    /**
     * Calculate similarity score between two strings (0-1)
     */
    similarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Check if query matches text with fuzzy matching
     */
    fuzzyMatch(query, text) {
        if (!query || !text) return { matches: false, score: 0 };
        
        query = query.toLowerCase();
        text = text.toLowerCase();

        // Exact match gets highest score
        if (text.includes(query)) {
            return { matches: true, score: 1.0, type: 'exact' };
        }

        // Check word-by-word fuzzy matching
        const queryWords = query.split(/\s+/);
        const textWords = text.split(/\s+/);
        
        let totalScore = 0;
        let matchedWords = 0;

        queryWords.forEach(qWord => {
            let bestScore = 0;
            textWords.forEach(tWord => {
                const score = this.similarity(qWord, tWord);
                if (score > bestScore) {
                    bestScore = score;
                }
            });
            
            if (bestScore >= this.threshold) {
                matchedWords++;
                totalScore += bestScore;
            }
        });

        if (matchedWords > 0) {
            const avgScore = totalScore / queryWords.length;
            return { matches: true, score: avgScore, type: 'fuzzy' };
        }

        return { matches: false, score: 0 };
    }

    /**
     * Search across multiple fields
     */
    searchItem(query, item, fields) {
        if (!query) return { matches: true, score: 1.0, matchedFields: [] };

        let bestScore = 0;
        const matchedFields = [];

        fields.forEach(field => {
            const value = item[field] || item.fields?.[field] || '';
            const result = this.fuzzyMatch(query, String(value));
            
            if (result.matches) {
                matchedFields.push({
                    field,
                    score: result.score,
                    type: result.type
                });
                
                if (result.score > bestScore) {
                    bestScore = result.score;
                }
            }
        });

        return {
            matches: matchedFields.length > 0,
            score: bestScore,
            matchedFields
        };
    }

    /**
     * Search and rank items
     */
    search(query, items, fields) {
        if (!query || !items || items.length === 0) {
            return items;
        }

        // Search all items
        const results = items.map(item => {
            const searchResult = this.searchItem(query, item, fields);
            return {
                item,
                ...searchResult
            };
        });

        // Filter matches and sort by score
        return results
            .filter(r => r.matches)
            .sort((a, b) => b.score - a.score)
            .map(r => r.item);
    }

    /**
     * Highlight matched terms in text
     */
    highlightMatches(query, text) {
        if (!query || !text) return text;

        const queryWords = query.toLowerCase().split(/\s+/);
        let highlightedText = text;

        queryWords.forEach(word => {
            // Exact match highlighting
            const regex = new RegExp(`(${word})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
        });

        return highlightedText;
    }

    /**
     * Get search suggestions based on partial query
     */
    getSuggestions(query, items, field, maxSuggestions = 5) {
        if (!query || !items || items.length === 0) return [];

        const values = [...new Set(items.map(item => 
            item[field] || item.fields?.[field] || ''
        ))].filter(v => v);

        const matches = values.map(value => ({
            value,
            score: this.similarity(query.toLowerCase(), value.toLowerCase())
        }));

        return matches
            .filter(m => m.score >= this.threshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSuggestions)
            .map(m => m.value);
    }
}

// Initialize global semantic search
window.semanticSearch = new SemanticSearch();

// Helper function to enhance existing search with fuzzy matching
function enhanceSearchWithFuzzy(searchFunction, items, fields) {
    return function(query) {
        if (!query) {
            return searchFunction(query);
        }

        // Use semantic search
        const results = window.semanticSearch.search(query, items, fields);
        return results;
    };
}

// Expose globally
window.enhanceSearchWithFuzzy = enhanceSearchWithFuzzy;

console.log('[SemanticSearch] Module loaded. Use semanticSearch.search(query, items, fields) for fuzzy matching.');

