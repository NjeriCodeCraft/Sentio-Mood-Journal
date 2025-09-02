// Sentiment and emotion analysis manager for Sentio
class SentimentAnalyzer {
    constructor() {
        this.apiKey = CONFIG.HUGGINGFACE_API_KEY;
        this.emotionModelUrl = `https://api-inference.huggingface.co/models/${CONFIG.EMOTION_MODEL}`;
        this.emotionLabels = ['anger', 'disgust', 'fear', 'joy', 'neutral', 'sadness', 'surprise'];
        
        if (!this.apiKey) {
            console.warn('Hugging Face API key is missing. Using fallback analysis.');
        }
    }

    async analyzeSentiment(text) {
        if (!text || text.trim().length === 0) {
            return this.getDefaultEmotionResponse();
        }

        // If API key is missing, use fallback analysis
        if (!this.apiKey) {
            return this.fallbackSentimentAnalysis(text);
        }

        try {
            const response = await fetch(this.emotionModelUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: text,
                    options: {
                        wait_for_model: true
                    }
                })
            });

            if (!response.ok) {
                console.warn('Emotion analysis failed, falling back to keyword analysis');
                return this.fallbackSentimentAnalysis(text);
            }

            const result = await response.json();

            if (!Array.isArray(result) || result.length === 0) {
                return this.fallbackSentimentAnalysis(text);
            }

            // Normalize response into an emotions object with scores in [0,1]
            const emotions = {
                anger: 0,
                disgust: 0,
                fear: 0,
                joy: 0,
                neutral: 0,
                sadness: 0,
                surprise: 0
            };

            const first = result[0];
            // Two common shapes:
            // 1) [{ label: 'joy', score: 0.8 }, ...]
            // 2) [0.1, 0.0, 0.05, 0.7, 0.05, 0.08, 0.02]
            if (Array.isArray(first) && first.length > 0 && typeof first[0] === 'object' && 'label' in first[0]) {
                first.forEach(item => {
                    const key = String(item.label || '').toLowerCase();
                    if (key in emotions) {
                        emotions[key] = Number(item.score) || 0;
                    }
                });
            } else if (Array.isArray(first)) {
                first.forEach((score, index) => {
                    const emotion = this.emotionLabels[index] || `emotion_${index}`;
                    if (emotion in emotions) {
                        emotions[emotion] = Number(score) || 0;
                    }
                });
            } else if (typeof result === 'object' && Array.isArray(result[0])) {
                // Some APIs nest two arrays
                const inner = result[0];
                if (inner.length && typeof inner[0] === 'object' && 'label' in inner[0]) {
                    inner.forEach(item => {
                        const key = String(item.label || '').toLowerCase();
                        if (key in emotions) {
                            emotions[key] = Number(item.score) || 0;
                        }
                    });
                }
            }

            // Ensure values are normalized to sum to <= 1 and derive dominant emotion
            const dominantEmotion = Object.entries(emotions)
                .reduce((acc, [k, v]) => (v > acc.val ? { key: k, val: v } : acc), { key: 'neutral', val: 0 }).key;
            
            // Get mood category and advice
            const { mood, advice } = this.analyzeEmotions(emotions);
            
            return {
                label: mood,
                score: emotions[dominantEmotion],
                emotions,
                advice,
                raw: result[0]
            };
        } catch (error) {
            console.error('Emotion analysis error:', error);
            return this.fallbackSentimentAnalysis(text);
        }
    }

getDominantEmotion(emotionScores) {
        let maxScore = -1;
        let dominantIndex = 0;
        
        emotionScores.forEach((score, index) => {
            if (score > maxScore) {
                maxScore = score;
                dominantIndex = index;
            }
        });
        
        return this.emotionLabels[dominantIndex] || 'neutral';
    }
    
    analyzeEmotions(emotions) {
        const { joy, sadness, anger, fear, surprise, disgust, neutral } = emotions;

        // Mixed anger + sadness (your example)
        if (sadness >= 0.35 && anger >= 0.35) {
            return {
                mood: 'Sad & Angry',
                advice: "Oh nooo, that sounds really bad. 💔 Please take a breath, sip some water, check for any injuries, and tell a responsible adult or someone you trust. You didn’t deserve that."
            };
        }

        // Strong positives
        if (joy >= 0.6 && anger < 0.2 && sadness < 0.2) {
            return {
                mood: 'Happy',
                advice: 'Wow, that is really nice to hear, Chommie! 🌸 Keep enjoying these moments and maybe celebrate with a small treat or a message to your friend.'
            };
        }

        if (sadness >= 0.5 && anger < 0.35) {
            return {
                mood: 'Sad',
                advice: "I’m really sorry you’re going through this. 💙 Try a gentle check-in: a glass of water, slow breathing, and reach out to someone you trust."
            };
        }

        if (anger >= 0.5 && sadness < 0.35) {
            return {
                mood: 'Angry',
                advice: "It’s completely valid to feel angry. 😤 When you’re ready, try writing what happened and what you need right now."
            };
        }

        if (fear >= 0.5) {
            return {
                mood: 'Anxious',
                advice: "That sounds stressful. 🤗 Try 4-7-8 breathing (in 4, hold 7, out 8) and ground yourself by noticing 5 things you can see."
            };
        }

        if (surprise >= 0.6) {
            return {
                mood: 'Surprised',
                advice: 'That was unexpected! 😮 Take a moment to process and decide what support you might want.'
            };
        }

        // Default neutral/mixed support
        return {
            mood: 'Neutral',
            advice: 'Thanks for sharing, Chommie. 🌟 Keep listening to yourself. A short walk or a favorite song might help right now.'
        };
    }
    
    getDefaultEmotionResponse() {
        return {
            label: 'neutral',
            score: 1,
            emotions: { neutral: 1 },
            advice: 'Write something to analyze your mood!',
            raw: []
        };
    }

    fallbackSentimentAnalysis(text) {
        // Enhanced keyword/phrase-based emotion analysis as fallback
        const emotionKeywords = {
            joy: ['happy', 'joy', 'love', 'excited', 'amazing', 'wonderful', 'great',
                  'fantastic', 'excellent', 'good', 'awesome', 'brilliant', 'perfect',
                  'smile', 'laugh', 'celebrate', 'success', 'achievement', 'grateful',
                  'thankful', 'blessed', 'optimistic', 'hopeful', 'confident', 'proud',
                  'ecstatic', 'thrilled', 'delighted', 'nice', 'friend', 'together',
                  'weekend', 'gym', 'pray', 'prayed'],

            sadness: ['sad', 'depressed', 'down', 'unhappy', 'miserable', 'heartbroken',
                      'gloomy', 'hopeless', 'lonely', 'tearful', 'disappointed', 'grief',
                      'sorrow', 'melancholy', 'despair', 'cry', 'crying', 'hurt', 'bad',
                      'fell', 'falling', 'injury', 'pain', 'ache'],

            anger: ['angry', 'mad', 'furious', 'enraged', 'irritated', 'annoyed',
                    'frustrated', 'outraged', 'livid', 'irate', 'seething', 'bitter',
                    'resentful', 'aggravated', 'infuriated', 'unfair', 'rude', 'mean',
                    'push', 'pushed', 'shove', 'shoved', 'attack', 'assault'],

            fear: ['afraid', 'scared', 'frightened', 'terrified', 'nervous', 'anxious',
                   'worried', 'panicked', 'dread', 'apprehensive', 'uneasy', 'tense',
                   'intimidated', 'threatened'],

            surprise: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned',
                       'astounded', 'dumbfounded', 'flabbergasted', 'bewildered',
                       'startled', 'taken aback']
        };

        const emotionPhrases = {
            sadness: ['really bad', 'fell down', 'made me cry', 'broke my heart'],
            anger: ['why would someone do that', 'pushed me', 'did that to me', 'so unfair'],
            joy: ['really good', 'so happy', 'times like this', 'met a friend']
        };

        const textLower = text.toLowerCase();
        const words = textLower.split(/\s+/);
        const emotionCounts = { joy: 0, sadness: 0, anger: 0, fear: 0, surprise: 0 };

        // Phrase boosts (count as 2)
        Object.entries(emotionPhrases).forEach(([emotion, phrases]) => {
            phrases.forEach(phrase => {
                if (textLower.includes(phrase)) emotionCounts[emotion] += 2;
            });
        });

        // Word matches (count as 1)
        words.forEach(word => {
            Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
                if (keywords.some(keyword => word.includes(keyword))) {
                    emotionCounts[emotion] += 1;
                }
            });
        });

        // Convert counts to normalized scores
        const total = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
        const emotionScores = { neutral: 0 };
        if (total > 0) {
            Object.entries(emotionCounts).forEach(([emotion, count]) => {
                emotionScores[emotion] = count / total;
            });
        } else {
            // No signals → neutral
            return {
                label: 'Neutral',
                score: 1,
                emotions: { neutral: 1 },
                advice: 'Thanks for sharing. If you add a bit more detail, I can help better.',
                isFallback: true
            };
        }

        // Get dominant emotion from keyword analysis
        let dominantEmotion = 'neutral';
        let maxScore = 0;
        
        Object.entries(emotionScores).forEach(([emotion, score]) => {
            if (score > maxScore) {
                maxScore = score;
                dominantEmotion = emotion;
            }
        });

        // If scores are very flat, keep proportions but label neutral
        if (maxScore < 0.25) {
            dominantEmotion = 'neutral';
        }

        // Get mood and advice based on dominant emotion
        const { mood, advice } = this.analyzeEmotions(emotionScores);
        
        return {
            label: mood,
            score: maxScore,
            emotions: emotionScores,
            advice,
            isFallback: true
        };
    }

    getMoodColor(sentiment) {
        switch (sentiment.toLowerCase()) {
            case 'positive':
                return CONFIG.CHART_COLORS.POSITIVE;
            case 'negative':
                return CONFIG.CHART_COLORS.NEGATIVE;
            default:
                return CONFIG.CHART_COLORS.NEUTRAL;
        }
    }

    getSentimentEmoji(sentiment) {
        switch (sentiment.toLowerCase()) {
            case 'positive':
                return '😊';
            case 'negative':
                return '😔';
            default:
                return '😐';
        }
    }
}
