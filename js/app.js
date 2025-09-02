// Main application controller for Sentio
class SentioApp {
    constructor() {
        this.currentUser = null;
        this.supabase = null;
        this.currentTab = 'home';
        this.moodPrompts = [
            { emoji: '😊', title: 'Want to capture this moment?', description: 'Share what\'s making you feel good today' },
            { emoji: '😔', title: 'Feeling a bit down?', description: 'Let\'s talk about what\'s on your mind' },
            { emoji: '😡', title: 'Want to vent today?', description: 'Sometimes we need to let it all out' },
            { emoji: '😰', title: 'Feeling stressed?', description: 'Writing can help organize your thoughts' },
            { emoji: '🤔', title: 'Something on your mind?', description: 'Share your thoughts and reflections' },
            { emoji: '😴', title: 'How was your day?', description: 'Reflect on the moments that mattered' }
        ];
        this.currentPromptIndex = 0;
        this.init();
    }

    async init() {
        try {
            // Initialize configuration first
            await CONFIG.init();
            
            // Initialize Supabase client
            this.supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
            
            // Initialize components
            this.auth = new AuthManager(this.supabase);
            this.sentiment = new SentimentAnalyzer();
            this.database = new DatabaseManager(this.supabase);
            this.chartManager = new ChartManager();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start mood prompt rotation
            this.startMoodPromptRotation();
            
            // Check authentication state
            await this.checkAuthState();
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Landing page events
        document.getElementById('show-signup')?.addEventListener('click', () => {
            this.showAuthScreen();
            this.showRegisterForm();
        });

        document.getElementById('show-login')?.addEventListener('click', () => {
            this.showAuthScreen();
            this.showLoginForm();
        });

        // Authentication events
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });

        document.getElementById('show-login-form')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });

        document.getElementById('back-to-landing')?.addEventListener('click', () => {
            this.showLandingScreen();
        });

        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation events
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Dashboard events
        document.getElementById('start-journaling')?.addEventListener('click', () => {
            this.switchTab('journal');
        });

        // Journal events
        document.getElementById('analyze-mood')?.addEventListener('click', () => {
            this.analyzeEntry();
        });

        document.getElementById('save-entry')?.addEventListener('click', () => {
            this.saveJournalEntry();
        });

        // Theme toggle events
        document.getElementById('light-theme')?.addEventListener('click', () => {
            this.setTheme('light');
        });

        document.getElementById('dark-theme')?.addEventListener('click', () => {
            this.setTheme('dark');
        });

        // Export CSV event
        document.getElementById('export-csv')?.addEventListener('click', () => {
            this.exportToCSV();
        });

        // Terms and conditions events
        document.getElementById('show-terms')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showTermsModal();
        });

        document.getElementById('close-terms')?.addEventListener('click', () => {
            this.hideTermsModal();
        });

        document.getElementById('accept-terms')?.addEventListener('click', () => {
            document.getElementById('terms-checkbox').checked = true;
            this.hideTermsModal();
        });

        // Close modal when clicking outside
        document.getElementById('terms-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'terms-modal') {
                this.hideTermsModal();
            }
        });

        // Edit profile events
        document.getElementById('edit-profile')?.addEventListener('click', () => {
            this.enterEditMode();
        });

        document.getElementById('save-profile')?.addEventListener('click', () => {
            this.saveProfileChanges();
        });

        document.getElementById('cancel-edit')?.addEventListener('click', () => {
            this.cancelEdit();
        });

        // Hide loading screen after initialization
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 2000);
    }

    async checkAuthState() {
        const { data: { session } } = await this.supabase.auth.getSession();
        
        if (session) {
            this.currentUser = session.user;
            this.showMainScreen();
            await this.loadUserData();
        } else {
            this.showLandingScreen();
        }
    }

    showLandingScreen() {
        document.getElementById('landing-screen').classList.remove('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }

    showAuthScreen() {
        document.getElementById('landing-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('main-screen').classList.add('hidden');
    }

    showMainScreen() {
        document.getElementById('landing-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        
        if (this.currentUser) {
            const nickname = this.currentUser.user_metadata?.nickname || 'Chommie';
            document.getElementById('personalized-greeting').textContent = `Hi ${nickname}, welcome back ✨`;
            
            // Update profile info
            document.getElementById('profile-name').textContent = this.currentUser.user_metadata?.full_name || '--';
            document.getElementById('profile-nickname').textContent = nickname;
            document.getElementById('profile-email').textContent = this.currentUser.email;
        }
        
        this.switchTab('home');
    }

    showLoginForm() {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    }

    showRegisterForm() {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const result = await this.auth.signIn(email, password);
            if (result.success) {
                this.currentUser = result.user;
                this.showMainScreen();
                await this.loadUserData();
                this.showSuccess('Welcome back!');
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Login failed. Please try again.');
        }
    }

    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const nickname = document.getElementById('register-nickname').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const termsAccepted = document.getElementById('terms-checkbox').checked;

        if (!termsAccepted) {
            this.showError('Please accept the Terms & Conditions to continue.');
            return;
        }

        try {
            const result = await this.auth.signUp(email, password, { 
                full_name: name,
                nickname: nickname 
            });
            if (result.success) {
                this.showSuccess('Account created! Please check your email to verify your account.');
                this.showLoginForm();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            this.showError('Registration failed. Please try again.');
        }
    }

    async handleLogout() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
            this.showLandingScreen();
            this.showSuccess('Logged out successfully');
        } catch (error) {
            this.showError('Logout failed');
        }
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`)?.classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        if (tabName === 'insights') {
            this.loadInsightsData();
        }
    }

    startMoodPromptRotation() {
        this.updateMoodPrompt();
        setInterval(() => {
            this.currentPromptIndex = (this.currentPromptIndex + 1) % this.moodPrompts.length;
            this.updateMoodPrompt();
        }, 10000); // Change every 10 seconds
    }

    updateMoodPrompt() {
        const prompt = this.moodPrompts[this.currentPromptIndex];
        document.getElementById('mood-prompt-emoji').textContent = prompt.emoji;
        document.getElementById('mood-prompt-title').textContent = prompt.title;
        document.getElementById('mood-prompt-description').textContent = prompt.description;
    }

    async analyzeEntry() {
        console.log('Analyze button clicked');
        const text = document.getElementById('journal-text').value.trim();
        const saveButton = document.getElementById('save-entry');
        const moodAnalysis = document.getElementById('mood-analysis');
        
        console.log('Journal text:', text);
        console.log('Save button:', saveButton);
        console.log('Mood analysis element:', moodAnalysis);
        
        if (!text) {
            const error = 'Please enter some text to analyze';
            console.error(error);
            this.showError(error);
            return;
        }

        try {
            saveButton.disabled = true;
            const analyzingIndicator = document.getElementById('analyzing-indicator');
            if (analyzingIndicator) analyzingIndicator.classList.remove('hidden');
            
            // Ensure sentiment analyzer is properly initialized
            if (!this.sentiment) {
                this.sentiment = new SentimentAnalyzer();
            }
            
            // Analyze text using the enhanced emotion analysis
            const analysis = await this.sentiment.analyzeSentiment(text);
            
            // Ensure we have valid analysis results
            if (!analysis || !analysis.emotions) {
                throw new Error('Failed to analyze text. Please try again.');
            }
            
            // Update mood bars with emotion scores
            const emotions = analysis.emotions || {};
            
            // Map emotion scores to the UI elements
            const updateMoodBar = (emotion, barElementId, percentElementId) => {
                const score = Math.round((emotions[emotion] || 0) * 100);
                const barEl = document.getElementById(barElementId);
                if (barEl) {
                    barEl.style.width = `${score}%`;
                }
                const pctEl = document.getElementById(percentElementId);
                if (pctEl) {
                    pctEl.textContent = `${score}%`;
                }
                return score;
            };
            
            // Update all emotion bars
            updateMoodBar('joy', 'happy-score', 'happy-percentage');
            updateMoodBar('sadness', 'sad-score', 'sad-percentage');
            updateMoodBar('anger', 'angry-score', 'angry-percentage');
            updateMoodBar('fear', 'fear-score', 'fear-percentage');
            updateMoodBar('surprise', 'surprise-score', 'surprise-percentage');
            
            // Display the AI advice from the analysis
            const adviceElement = document.getElementById('ai-advice-text');
            if (adviceElement) {
                adviceElement.textContent = analysis.advice || "I'm here to listen. How are you feeling today?";
            }
            
            // Show the mood analysis section
            if (moodAnalysis) {
                moodAnalysis.classList.remove('hidden');
                moodAnalysis.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            
            // Update the mood label if it exists
            const moodLabel = document.getElementById('mood-label');
            if (moodLabel) {
                moodLabel.textContent = analysis.label || 'Neutral';
                moodLabel.className = `mood-${analysis.label?.toLowerCase() || 'neutral'}`;
            }
            
            // Enable save button and hide analyzing indicator
            saveButton.disabled = false;
            if (analyzingIndicator) analyzingIndicator.classList.add('hidden');
            
            // Store the current analysis for saving
            this.currentAnalysis = analysis;
            
        } catch (error) {
            console.error('Mood analysis failed:', error);
            this.showError('Failed to analyze mood. Please try again.');
            
            // Reset UI on error
            const analyzingIndicator = document.getElementById('analyzing-indicator');
            if (analyzingIndicator) analyzingIndicator.classList.add('hidden');
            saveButton.disabled = false;
        }
    }

    setTheme(theme) {
        document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${theme}-theme`).classList.add('active');
        
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
        
        localStorage.setItem('sentio-theme', theme);
    }

    async exportToCSV() {
        if (!this.currentUser) return;
        
        try {
            const entries = await this.database.getUserEntries(this.currentUser.id, 1000);
            
            if (!entries || entries.length === 0) {
                this.showError('No entries to export');
                return;
            }
            
            const csvContent = this.convertToCSV(entries);
            this.downloadCSV(csvContent, 'sentio-mood-journal.csv');
            this.showSuccess('Journal exported successfully!');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError('Failed to export journal');
        }
    }

    convertToCSV(entries) {
        const headers = ['Date', 'Mood', 'Content'];
        const rows = entries.map(entry => [
            new Date(entry.created_at).toLocaleDateString(),
            entry.sentiment_label,
            `"${entry.content.replace(/"/g, '""')}"`
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    async loadInsightsData() {
        if (!this.currentUser) return;
        
        try {
            // Show loading state
            const loadingIndicator = document.getElementById('insights-loading');
            const insightsContent = document.getElementById('insights-content');
            
            if (loadingIndicator) loadingIndicator.classList.remove('hidden');
            if (insightsContent) insightsContent.classList.add('hidden');
            
            // Get entries with pagination
            const entries = await this.database.getUserEntries(this.currentUser.id, 100);
            
            // Process entries to ensure they have the correct mood_data format
            const processedEntries = entries.map(entry => {
                try {
                    if (entry.mood_data) {
                        // If mood_data is a string, parse it
                        if (typeof entry.mood_data === 'string') {
                            entry.mood_data = JSON.parse(entry.mood_data);
                        }
                        
                        // Ensure emotions object exists
                        if (!entry.mood_data.emotions) {
                            entry.mood_data.emotions = {
                                joy: 0,
                                sadness: 0,
                                anger: 0,
                                fear: 0,
                                surprise: 0
                            };
                            
                            // Migrate old format if needed
                            if (entry.mood_data.joy !== undefined) {
                                entry.mood_data.emotions.joy = entry.mood_data.joy;
                            }
                            if (entry.mood_data.sadness !== undefined) {
                                entry.mood_data.emotions.sadness = entry.mood_data.sadness;
                            }
                            if (entry.mood_data.anger !== undefined) {
                                entry.mood_data.emotions.anger = entry.mood_data.anger;
                            }
                        }
                    } else {
                        // Initialize empty mood_data if it doesn't exist
                        entry.mood_data = {
                            emotions: {
                                joy: 0,
                                sadness: 0,
                                anger: 0,
                                fear: 0,
                                surprise: 0
                            },
                            dominantEmotion: entry.mood || 'neutral',
                            advice: '',
                            timestamp: entry.created_at
                        };
                    }
                    
                    return entry;
                } catch (e) {
                    console.error('Error processing entry:', e);
                    return null;
                }
            }).filter(Boolean); // Remove any null entries from errors
            
            // Update the mood trend chart with processed entries
            this.chartManager.updateMoodTrendChart(processedEntries);
            
            // Update the mood pie chart with processed entries
            this.chartManager.updateMoodPieChart(processedEntries);
            
            // Display recent entries
            this.displayRecentEntries(processedEntries);
            
            // Update UI
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            if (insightsContent) insightsContent.classList.remove('hidden');
            
        } catch (error) {
            console.error('Error loading insights data:', error);
            this.showError('Failed to load insights data');
            
            // Ensure loading indicators are hidden on error
            const loadingIndicator = document.getElementById('insights-loading');
            const insightsContent = document.getElementById('insights-content');
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            if (insightsContent) insightsContent.classList.remove('hidden');
        }
    }

    showTermsModal() {
        document.getElementById('terms-modal').classList.remove('hidden');
    }

    hideTermsModal() {
        document.getElementById('terms-modal').classList.add('hidden');
    }

    enterEditMode() {
        // Get current user info
        const currentName = this.currentUser?.user_metadata?.full_name || '';
        const currentNickname = this.currentUser?.user_metadata?.nickname || '';
        const currentEmail = this.currentUser?.email || '';
        
        // Populate edit fields
        document.getElementById('edit-name').value = currentName;
        document.getElementById('edit-nickname').value = currentNickname;
        document.getElementById('profile-email-readonly').textContent = currentEmail;
        
        // Switch to edit mode
        document.getElementById('profile-view-mode').classList.add('hidden');
        document.getElementById('profile-edit-mode').classList.remove('hidden');
    }

    cancelEdit() {
        // Switch back to view mode
        document.getElementById('profile-edit-mode').classList.add('hidden');
        document.getElementById('profile-view-mode').classList.remove('hidden');
    }

    async saveProfileChanges() {
        const newName = document.getElementById('edit-name').value.trim();
        const newNickname = document.getElementById('edit-nickname').value.trim();
        
        if (!newName || !newNickname) {
            this.showError('Please provide both name and nickname.');
            return;
        }

        try {
            const { error } = await this.supabase.auth.updateUser({
                data: {
                    full_name: newName,
                    nickname: newNickname
                }
            });

            if (error) {
                this.showError('Failed to update profile: ' + error.message);
                return;
            }

            // Update current user object
            this.currentUser.user_metadata.full_name = newName;
            this.currentUser.user_metadata.nickname = newNickname;

            // Refresh displays
            this.updateProfileDisplay();
            this.updateDashboardGreeting();
            
            // Switch back to view mode
            this.cancelEdit();
            
            this.showSuccess('Profile updated successfully!');
            
        } catch (error) {
            console.error('Profile update error:', error);
            this.showError('Failed to update profile. Please try again.');
        }
    }


    updateProfileDisplay() {
        if (!this.currentUser) return;
        
        const name = this.currentUser.user_metadata?.full_name || 'User';
        const nickname = this.currentUser.user_metadata?.nickname || 'Friend';
        const email = this.currentUser.email || '';
        
        // Update profile tab display
        document.getElementById('profile-name').textContent = name;
        document.getElementById('profile-nickname').textContent = nickname;
        document.getElementById('profile-email').textContent = email;
    }

    updateDashboardGreeting() {
        if (!this.currentUser) return;
        
        const nickname = this.currentUser.user_metadata?.nickname || 'Friend';
        const greetings = [
            `Hey ${nickname}! 👋`,
            `Hello ${nickname}! ✨`,
            `Hi there, ${nickname}! 🌟`,
            `Welcome back, ${nickname}! 💫`
        ];
        
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        document.getElementById('personalized-greeting').textContent = randomGreeting;
    }


    async saveJournalEntry() {
        const text = document.getElementById('journal-text').value.trim();
        const saveButton = document.getElementById('save-entry');
        
        if (!text || !this.currentUser) {
            this.showError('Please write something to save');
            return;
        }

        try {
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            // Get the current mood analysis or analyze the text if not available
            const analysis = this.currentAnalysis || await this.sentiment.analyzeSentiment(text);
            
            // Prepare mood data for storage
            const moodData = {
                emotions: analysis.emotions || {},
                dominantEmotion: analysis.label || 'neutral',
                advice: analysis.advice || '',
                timestamp: new Date().toISOString()
            };
            
            const entry = {
                user_id: this.currentUser.id,
                content: text,
                mood: analysis.label || 'neutral',
                mood_data: JSON.stringify(moodData),
                sentiment_score: analysis.score || 0,
                created_at: new Date().toISOString()
            };

            const result = await this.database.saveJournalEntry(entry);
            
            if (result.success) {
                this.showSuccess('Entry saved successfully!');
                document.getElementById('journal-text').value = '';
                
                // Hide the mood analysis section
                const moodAnalysis = document.getElementById('mood-analysis');
                if (moodAnalysis) {
                    moodAnalysis.classList.add('hidden');
                }
                
                // Reset the save button
                saveButton.innerHTML = '<i class="fas fa-save"></i> Save Entry';
                saveButton.disabled = false;
                
                // Clear current analysis
                this.currentAnalysis = null;
                
                // Refresh the dashboard and insights
                await Promise.all([
                    this.loadUserData(),
                    this.loadInsightsData()
                ]);
                
                // Switch to the insights tab to show the new entry
                this.switchTab('insights');
            } else {
                throw new Error(result.error || 'Failed to save entry');
            }
        } catch (error) {
            console.error('Error saving entry:', error);
            this.showError(error.message || 'An error occurred while saving your entry');
            
            // Reset the save button on error
            const saveButton = document.getElementById('save-entry');
            if (saveButton) {
                saveButton.innerHTML = '<i class="fas fa-save"></i> Save Entry';
                saveButton.disabled = false;
            }
        }
    }

    getCurrentMoodAnalysis() {
        const happyScore = parseInt(document.getElementById('happy-percentage')?.textContent) || 0;
        const sadScore = parseInt(document.getElementById('sad-percentage')?.textContent) || 0;
        const angryScore = parseInt(document.getElementById('angry-percentage')?.textContent) || 0;
        
        let dominant = 'neutral';
        let score = 0;
        
        if (happyScore > sadScore && happyScore > angryScore) {
            dominant = 'positive';
            score = happyScore / 100;
        } else if (sadScore > happyScore && sadScore > angryScore) {
            dominant = 'negative';
            score = -sadScore / 100;
        } else if (angryScore > happyScore && angryScore > sadScore) {
            dominant = 'negative';
            score = -angryScore / 100;
        }
        
        return { dominant, score, happy: happyScore, sad: sadScore, angry: angryScore };
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            // Load recent entries
            const entries = await this.database.getUserEntries(this.currentUser.id, 10);
            
            // Load mood data for dashboard stats
            const allEntries = await this.database.getUserEntries(this.currentUser.id, 1000);
            
            // Update dashboard stats
            this.updateDashboardStats(allEntries);
            
            // Update recent entries in insights
            this.displayRecentEntries(entries);

        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    updateDashboardStats(entries) {
        const streakEl = document.getElementById('current-streak');
        const totalEntriesEl = document.getElementById('total-entries');
        const avgMoodEl = document.getElementById('avg-mood-score');
        
        // Check if elements exist before trying to update them
        if (!streakEl || !totalEntriesEl || !avgMoodEl) {
            console.warn('Dashboard elements not found');
            return;
        }

        if (!entries || entries.length === 0) {
            // Hide or reset dashboard stats if no entries
            streakEl.textContent = '0';
            totalEntriesEl.textContent = '0';
            avgMoodEl.textContent = '--';
            return;
        }

        // Calculate total entries
        const totalEntries = entries.length;
        totalEntriesEl.textContent = totalEntries;

        // Calculate current streak
        const streak = this.calculateStreak(entries);
        streakEl.textContent = streak;

        // Calculate average mood
        if (entries.length > 0) {
            const totalScore = entries.reduce((sum, entry) => {
                return sum + (entry.sentiment_analysis?.score || 0);
            }, 0);
            const avgScore = totalScore / entries.length;
            
            // Convert score to emoji
            let moodEmoji = '😐';
            if (avgScore > 0.3) moodEmoji = '😊';
            else if (avgScore < -0.3) moodEmoji = '😔';
            
            avgMoodEl.textContent = `${moodEmoji} ${Math.abs(avgScore * 100).toFixed(0)}%`;
        } else {
            avgMoodEl.textContent = '--';
        }
    }

    displayRecentEntries(entries) {
        const container = document.getElementById('recent-entries');
        
        if (!entries || entries.length === 0) {
            container.innerHTML = '<p class="empty-state">No entries yet. Start journaling to see your history!</p>';
            return;
        }
        
        // Sort entries by date (newest first)
        const sortedEntries = [...entries].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        // Limit to 10 most recent entries
        const recentEntries = sortedEntries.slice(0, 10);
        
        container.innerHTML = recentEntries.map(entry => {
            const date = new Date(entry.created_at);
            const formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Process mood data
            let moodData = {};
            try {
                moodData = typeof entry.mood_data === 'string' 
                    ? JSON.parse(entry.mood_data) 
                    : (entry.mood_data || {});
                
                // Ensure emotions object exists
                if (!moodData.emotions) {
                    moodData.emotions = {
                        joy: 0,
                        sadness: 0,
                        anger: 0,
                        fear: 0,
                        surprise: 0
                    };
                }
                
                // Get dominant emotion
                const emotions = moodData.emotions;
                let dominantEmotion = 'neutral';
                let maxScore = 0;
                
                Object.entries(emotions).forEach(([emotion, score]) => {
                    if (score > maxScore) {
                        maxScore = score;
                        dominantEmotion = emotion;
                    }
                });
                
                moodData.dominantEmotion = moodData.dominantEmotion || dominantEmotion;
                
            } catch (e) {
                console.error('Error processing mood data for display:', e);
                moodData = {
                    emotions: {},
                    dominantEmotion: 'neutral',
                    advice: ''
                };
            }
            
            // Truncate content for preview
            const preview = entry.content.length > 100 
                ? entry.content.substring(0, 100) + '...' 
                : entry.content;
            
            // Format emotion scores for display
            const emotionScores = Object.entries(moodData.emotions || {})
                .filter(([_, score]) => score > 0.1) // Only show significant emotions
                .sort((a, b) => b[1] - a[1]) // Sort by score descending
                .map(([emotion, score]) => {
                    const percentage = Math.round(score * 100);
                    return `
                        <div class="emotion-tag ${emotion}">
                            <span class="emotion-name">${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
                            <span class="emotion-score">${percentage}%</span>
                        </div>
                    `;
                })
                .join('');
            
            // Get mood emoji and class
            const moodEmoji = this.getMoodEmoji(moodData.dominantEmotion || 'neutral');
            const moodClass = moodData.dominantEmotion ? moodData.dominantEmotion.toLowerCase() : 'neutral';
            
            return `
                <div class="entry-preview">
                    <div class="entry-header">
                        <span class="entry-date">${formattedDate}</span>
                        <span class="entry-mood ${moodClass}">
                            ${moodEmoji} ${moodClass.charAt(0).toUpperCase() + moodClass.slice(1)}
                        </span>
                    </div>
                    <div class="emotion-tags">
                        ${emotionScores || '<span class="no-emotions">No emotion data</span>'}
                    </div>
                    <p class="entry-preview-text">${preview}</p>
                    ${moodData.advice ? `<div class="entry-advice">
                        <strong>Note to self:</strong> ${moodData.advice}
                    </div>` : ''}
                </div>
            `;
        }).join('');

        const entriesCount = entries ? entries.length : 0;
        document.getElementById('total-entries').textContent = entriesCount;

        if (entries && entries.length > 0) {
            const avgMood = entries.reduce((sum, item) => sum + (item.sentiment_score || 0), 0) / entries.length;
            const avgMoodLabel = avgMood > 0.3 ? 'Positive' : avgMood < -0.3 ? 'Negative' : 'Neutral';
            document.getElementById('avg-mood-score').textContent = avgMoodLabel;
        } else {
            document.getElementById('avg-mood-score').textContent = '--';
        }

        // Calculate streak (simplified - consecutive days with entries)
        const streak = this.calculateStreak(entries);
        document.getElementById('current-streak').textContent = streak;
    }

    calculateStreak(entries) {
        if (!entries || entries.length === 0) return 0;
        
        // Sort entries by date in descending order
        const sortedEntries = [...entries].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        // If no entries, return 0
        if (sortedEntries.length === 0) return 0;
        
        // Start with 1 if there's at least one entry
        let streak = 1;
        let currentDate = new Date(sortedEntries[0].created_at);
        
        // Check previous days for consecutive entries
        for (let i = 1; i < sortedEntries.length; i++) {
            const entryDate = new Date(sortedEntries[i].created_at);
            const diffTime = currentDate - entryDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // If the next entry is from the previous day, increment streak
            if (diffDays === 1) {
                streak++;
                currentDate = entryDate;
            } 
            // If there's a gap of more than 1 day, stop counting
            else if (diffDays > 1) {
                break;
            }
            // If same day, just update the current date and continue
            else {
                currentDate = entryDate;
            }
        }
        
        return streak;
    }

    getMoodClass(sentiment) {
        const sentimentLower = sentiment?.toLowerCase() || 'neutral';
        switch (sentimentLower) {
            case 'happy':
            case 'joy':
                return 'mood-happy';
            case 'sad':
            case 'sadness':
                return 'mood-sad';
            case 'angry':
            case 'anger':
                return 'mood-angry';
            case 'fear':
            case 'anxious':
                return 'mood-fear';
            case 'surprise':
            case 'surprised':
                return 'mood-surprise';
            case 'disgust':
                return 'mood-disgust';
            default:
                return 'mood-neutral';
        }
    }
    
    getMoodEmoji(emotion) {
        const emotionLower = emotion?.toLowerCase() || 'neutral';
        switch (emotionLower) {
            case 'happy':
            case 'joy':
            case 'positive':
                return '😊';
            case 'sad':
            case 'sadness':
            case 'negative':
                return '😔';
            case 'angry':
            case 'anger':
                return '😡';
            case 'fear':
            case 'anxious':
                return '😨';
            case 'surprise':
            case 'surprised':
                return '😲';
            case 'disgust':
                return '🤢';
            case 'neutral':
            default:
                return '😐';
        }
    }

    showError(message) {
        const toast = document.getElementById('error-toast');
        const messageEl = document.getElementById('error-message');
        
        messageEl.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 5000);
    }

    showSuccess(message) {
        const toast = document.getElementById('success-toast');
        const messageEl = document.getElementById('success-message');
        
        messageEl.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000);
    }

    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load saved theme
    const savedTheme = localStorage.getItem('sentio-theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    window.sentioApp = new SentioApp();
});
