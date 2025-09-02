// Database manager for Sentio using Supabase
class DatabaseManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
    }

    async saveJournalEntry(entry) {
        try {
            const { data, error } = await this.supabase
                .from('journal_entries')
                .insert([{
                    user_id: entry.user_id,
                    content: entry.content,
                    sentiment_label: entry.sentiment_label,
                    sentiment_score: entry.sentiment_score,
                    created_at: entry.created_at
                }])
                .select();

            if (error) {
                console.error('Database error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Save entry error:', error);
            return { success: false, error: 'Failed to save entry' };
        }
    }

    async getUserEntries(userId, limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('journal_entries')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Get entries error:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Get entries error:', error);
            return [];
        }
    }

    async getUserMoodData(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await this.supabase
                .from('journal_entries')
                .select('created_at, sentiment_label, sentiment_score')
                .eq('user_id', userId)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Get mood data error:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Get mood data error:', error);
            return [];
        }
    }

    async getEntryById(entryId) {
        try {
            const { data, error } = await this.supabase
                .from('journal_entries')
                .select('*')
                .eq('id', entryId)
                .single();

            if (error) {
                console.error('Get entry by ID error:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Get entry by ID error:', error);
            return null;
        }
    }

    async updateEntry(entryId, updates) {
        try {
            const { data, error } = await this.supabase
                .from('journal_entries')
                .update(updates)
                .eq('id', entryId)
                .select();

            if (error) {
                console.error('Update entry error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Update entry error:', error);
            return { success: false, error: 'Failed to update entry' };
        }
    }

    async deleteEntry(entryId) {
        try {
            const { error } = await this.supabase
                .from('journal_entries')
                .delete()
                .eq('id', entryId);

            if (error) {
                console.error('Delete entry error:', error);
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error) {
            console.error('Delete entry error:', error);
            return { success: false, error: 'Failed to delete entry' };
        }
    }

    async getUserStats(userId) {
        try {
            // Get total entries count
            const { count: totalEntries } = await this.supabase
                .from('journal_entries')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            // Get entries from last 7 days
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);

            const { data: weekEntries, error } = await this.supabase
                .from('journal_entries')
                .select('sentiment_label, sentiment_score, created_at')
                .eq('user_id', userId)
                .gte('created_at', weekAgo.toISOString());

            if (error) {
                console.error('Get user stats error:', error);
                return null;
            }

            // Calculate average mood for the week
            let avgMood = 0;
            if (weekEntries && weekEntries.length > 0) {
                const totalScore = weekEntries.reduce((sum, entry) => {
                    // Convert sentiment to numeric score
                    let score = 0;
                    switch (entry.sentiment_label) {
                        case 'positive': score = 1; break;
                        case 'negative': score = -1; break;
                        default: score = 0;
                    }
                    return sum + score;
                }, 0);
                avgMood = totalScore / weekEntries.length;
            }

            // Calculate streak
            const streak = await this.calculateStreak(userId);

            return {
                totalEntries: totalEntries || 0,
                weekEntries: weekEntries?.length || 0,
                avgMood,
                streak
            };
        } catch (error) {
            console.error('Get user stats error:', error);
            return null;
        }
    }

    async calculateStreak(userId) {
        try {
            // Get entries from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data: entries, error } = await this.supabase
                .from('journal_entries')
                .select('created_at')
                .eq('user_id', userId)
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false });

            if (error || !entries) {
                return 0;
            }

            // Group entries by date
            const entriesByDate = {};
            entries.forEach(entry => {
                const date = new Date(entry.created_at).toDateString();
                entriesByDate[date] = true;
            });

            // Calculate consecutive days
            let streak = 0;
            const today = new Date();
            
            for (let i = 0; i < 30; i++) {
                const checkDate = new Date(today);
                checkDate.setDate(checkDate.getDate() - i);
                const dateString = checkDate.toDateString();
                
                if (entriesByDate[dateString]) {
                    streak++;
                } else {
                    break;
                }
            }

            return streak;
        } catch (error) {
            console.error('Calculate streak error:', error);
            return 0;
        }
    }

    async searchEntries(userId, query, limit = 20) {
        try {
            const { data, error } = await this.supabase
                .from('journal_entries')
                .select('*')
                .eq('user_id', userId)
                .textSearch('content', query)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('Search entries error:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Search entries error:', error);
            return [];
        }
    }
}
