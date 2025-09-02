// Chart manager for Sentio using Chart.js
class ChartManager {
    constructor() {
        this.moodChart = null;
        this.pieChart = null;
        this.initializeCharts();
    }

    updateMoodTrendChart(entries) {
        if (!this.moodChart) {
            this.initializeCharts();
            if (!this.moodChart) return; // Still couldn't initialize
        }

        // Process entries
        const labels = [];
        const positiveData = [];
        const negativeData = [];
        
        // Group entries by date (only keep the latest entry per day)
        const entriesByDate = {};
        
        entries.forEach(entry => {
            if (entry.timestamp && entry.sentiment_analysis) {
                const date = new Date(entry.timestamp);
                const dateStr = date.toLocaleDateString();
                
                // Keep only the latest entry per day
                if (!entriesByDate[dateStr] || new Date(entry.timestamp) > new Date(entriesByDate[dateStr].timestamp)) {
                    entriesByDate[dateStr] = entry;
                }
            }
        });

        // Sort entries by date
        const sortedEntries = Object.values(entriesByDate).sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        // Process data for the last 7 days
        const last7Days = new Array(7).fill(null).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toLocaleDateString();
        });

        last7Days.forEach(dateStr => {
            const entry = entriesByDate[dateStr];
            const date = new Date(dateStr);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            labels.push(dayName);
            
            if (entry) {
                const score = entry.sentiment_analysis?.score || 0;
                if (score > 0) {
                    positiveData.push(score);
                    negativeData.push(0);
                } else if (score < 0) {
                    positiveData.push(0);
                    negativeData.push(Math.abs(score));
                } else {
                    positiveData.push(0);
                    negativeData.push(0);
                }
            } else {
                positiveData.push(0);
                negativeData.push(0);
            }
        });

        // Update chart data
        this.moodChart.data.labels = labels;
        this.moodChart.data.datasets[0].data = positiveData;
        this.moodChart.data.datasets[1].data = negativeData;
        
        // Update chart
        this.moodChart.update();
    }

    initializeCharts() {
        const ctx = document.getElementById('mood-trend-chart');
        if (!ctx) return;

        this.moodChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Positive Mood',
                        data: [],
                        backgroundColor: 'rgba(74, 222, 128, 0.7)',
                        borderColor: 'rgba(74, 222, 128, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                        yAxisID: 'y',
                        barPercentage: 0.6
                    },
                    {
                        label: 'Negative Mood',
                        data: [],
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                        yAxisID: 'y'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#666',
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 13
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.12)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            title: function(context) {
                                return `Day: ${context[0].label}`;
                            },
                            label: function(context) {
                                const datasetLabel = context.dataset.label || '';
                                const value = context.parsed.y;
                                return `${datasetLabel}: ${value > 0 ? value.toFixed(2) : 0}`;
                            },
                            labelColor: function(context) {
                                return {
                                    borderColor: context.dataset.borderColor,
                                    backgroundColor: context.dataset.backgroundColor,
                                    borderWidth: 2,
                                    borderRadius: 2,
                                };
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 12
                            }
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        stacked: true,
                        min: 0,
                        max: 1,
                        ticks: {
                            color: '#666',
                            font: {
                                size: 12
                            },
                            callback: function(value) {
                                if (value === 0) return 'Neutral';
                                if (value > 0.5) return 'Positive';
                                if (value < -0.5) return 'Negative';
                                return value.toFixed(1);
                            }
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Mood Intensity (0-1)',
                            color: '#666',
                            font: {
                                size: 12,
                                weight: '600'
                            },
                            padding: {top: 10, bottom: 10}
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        hoverBackgroundColor: CONFIG.CHART_COLORS.POSITIVE
                    }
                }
            }
        });
    }

    updateMoodChart(entries) {
        if (!this.moodChart || !entries || entries.length === 0) return;

        // Group entries by date and calculate average emotion scores
        const dailyData = {};
        
        // Process each entry
        entries.forEach(entry => {
            try {
                const entryDate = new Date(entry.created_at).toLocaleDateString();
                const moodData = typeof entry.mood_data === 'string' ? 
                    JSON.parse(entry.mood_data) : 
                    (entry.mood_data || {});
                
                if (!dailyData[entryDate]) {
                    dailyData[entryDate] = {
                        joy: 0,
                        sadness: 0,
                        anger: 0,
                        fear: 0,
                        surprise: 0,
                        count: 0
                    };
                }
                
                // Sum up emotion scores for averaging later
                dailyData[entryDate].joy += parseFloat(moodData.joy || 0);
                dailyData[entryDate].sadness += parseFloat(moodData.sadness || 0);
                dailyData[entryDate].anger += parseFloat(moodData.anger || 0);
                dailyData[entryDate].fear += parseFloat(moodData.fear || 0);
                dailyData[entryDate].surprise += parseFloat(moodData.surprise || 0);
                dailyData[entryDate].count++;
                
            } catch (e) {
                console.error('Error processing entry for mood chart:', e);
            }
        });
        
        // Sort dates chronologically
        const sortedDates = Object.keys(dailyData).sort((a, b) => 
            new Date(a) - new Date(b)
        );
        
        // Prepare datasets for each emotion
        const datasets = [
            {
                label: 'Joy',
                data: [],
                borderColor: CONFIG.CHART_COLORS.POSITIVE,
                backgroundColor: 'rgba(72, 187, 120, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: false
            },
            {
                label: 'Sadness',
                data: [],
                borderColor: '#3182ce',
                backgroundColor: 'rgba(49, 130, 206, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: false
            },
            {
                label: 'Anger',
                data: [],
                borderColor: CONFIG.CHART_COLORS.NEGATIVE,
                backgroundColor: 'rgba(245, 101, 101, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: false
            },
            {
                label: 'Fear',
                data: [],
                borderColor: '#9f7aea',
                backgroundColor: 'rgba(159, 122, 234, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: false
            },
            {
                label: 'Surprise',
                data: [],
                borderColor: '#f6e05e',
                backgroundColor: 'rgba(246, 224, 94, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: false
            }
        ];
        
        // Populate data for each emotion
        sortedDates.forEach(date => {
            const dayData = dailyData[date];
            const count = dayData.count || 1;
            
            datasets[0].data.push(dayData.joy / count);
            datasets[1].data.push(dayData.sadness / count);
            datasets[2].data.push(dayData.anger / count);
            datasets[3].data.push(dayData.fear / count);
            datasets[4].data.push(dayData.surprise / count);
        });
        
        // Update chart
        this.moodChart.data.labels = sortedDates;
        this.moodChart.data.datasets = datasets;
        
        // Update chart options for better visualization of multiple datasets
        this.moodChart.options.scales.y = {
            min: 0,
            max: 1,
            ticks: {
                stepSize: 0.2,
                callback: function(value) {
                    return (value * 100).toFixed(0) + '%';
                }
            },
            grid: {
                color: this.moodChart.options.scales.y?.grid?.color || 'rgba(0, 0, 0, 0.1)'
            }
        };
        
        this.moodChart.update('active');
    }

    updateMoodPieChart(entries) {
        const ctx = document.getElementById('mood-pie-chart');
        if (!ctx) return;

        // Initialize emotion counts with all possible emotions
        const emotionCount = {
            happy: 0,
            sad: 0,
            angry: 0,
            fear: 0,
            surprise: 0,
            neutral: 0
        };
        
        // Process entries to get emotion data
        entries.forEach(entry => {
            try {
                // Get mood data from the entry
                let moodData = {};
                if (entry.mood_data) {
                    try {
                        moodData = typeof entry.mood_data === 'string' ? 
                            JSON.parse(entry.mood_data) : 
                            entry.mood_data;
                    } catch (e) {
                        console.error('Error parsing mood_data:', e);
                    }
                }
                
                // Get the dominant emotion from mood data or fall back to entry.mood
                let dominantEmotion = (moodData.dominantEmotion || entry.mood || 'neutral').toLowerCase();
                
                // Map to our emotion categories with better detection
                if (dominantEmotion.includes('happy') || dominantEmotion.includes('joy') || dominantEmotion.includes('excited')) {
                    emotionCount.happy++;
                } else if (dominantEmotion.includes('sad') || dominantEmotion.includes('sadness') || dominantEmotion.includes('unhappy')) {
                    emotionCount.sad++;
                } else if (dominantEmotion.includes('angry') || dominantEmotion.includes('anger') || dominantEmotion.includes('frustrated')) {
                    emotionCount.angry++;
                } else if (dominantEmotion.includes('fear') || dominantEmotion.includes('anxious') || dominantEmotion.includes('worried')) {
                    emotionCount.fear++;
                } else if (dominantEmotion.includes('surprise') || dominantEmotion.includes('surprised') || dominantEmotion.includes('shocked')) {
                    emotionCount.surprise++;
                } else {
                    emotionCount.neutral++;
                }
            } catch (e) {
                console.error('Error processing mood data:', e);
                emotionCount.neutral++;
            }
        });
        
        // If no data, show a message
        if (entries.length === 0) {
            if (this.pieChart) {
                this.pieChart.destroy();
            }
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state text-center p-4';
            emptyState.innerHTML = `
                <i class="far fa-chart-pie text-4xl mb-2 opacity-50"></i>
                <p class="text-gray-500">No mood data available yet</p>
                <p class="text-sm text-gray-400 mt-1">Your mood distribution will appear here after you add entries</p>
            `;
            ctx.parentNode.innerHTML = '';
            ctx.parentNode.appendChild(emptyState);
            return;
        }
        
        // Filter out emotions with zero counts
        const emotionData = [
            { label: '😊 Happy', count: emotionCount.happy, color: '#4ade80' },
            { label: '😢 Sad', count: emotionCount.sad, color: '#60a5fa' },
            { label: '😠 Angry', count: emotionCount.angry, color: '#f87171' },
            { label: '😨 Fear', count: emotionCount.fear, color: '#a78bfa' },
            { label: '😲 Surprise', count: emotionCount.surprise, color: '#fbbf24' },
            { label: '😐 Neutral', count: emotionCount.neutral, color: '#9ca3af' }
        ].filter(emotion => emotion.count > 0);
        
        // Prepare chart data
        const labels = emotionData.map(emotion => emotion.label);
        const data = emotionData.map(emotion => emotion.count);
        const backgroundColors = emotionData.map(emotion => emotion.color);
        
        // Create or update chart
        if (!this.pieChart) {
            this.pieChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: backgroundColors,
                        borderWidth: 1,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: '#666',
                                padding: 12,
                                font: {
                                    size: 12
                                },
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 12,
                            displayColors: false,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '70%',
                    radius: '90%'
                }
            });
        } else {
            this.pieChart.data.labels = labels;
            this.pieChart.data.datasets[0].data = data;
            this.pieChart.data.datasets[0].backgroundColor = backgroundColors;
            this.pieChart.update();
        }
    }

    processMoodData(rawData) {
        if (!rawData || rawData.length === 0) {
            return { labels: [], values: [] };
        }

        // Group data by date and calculate daily average
        const dailyData = {};
        
        rawData.forEach(entry => {
            const date = new Date(entry.created_at).toDateString();
            const moodScore = this.convertSentimentToScore(entry.sentiment_label, entry.sentiment_score);
            
            if (!dailyData[date]) {
                dailyData[date] = { scores: [], count: 0 };
            }
            
            dailyData[date].scores.push(moodScore);
            dailyData[date].count++;
        });

        // Calculate daily averages and prepare chart data
        const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
        const labels = [];
        const values = [];

        sortedDates.forEach(dateString => {
            const date = new Date(dateString);
            const dayData = dailyData[dateString];
            const avgScore = dayData.scores.reduce((a, b) => a + b, 0) / dayData.count;
            
            // Format date for display
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            labels.push(formattedDate);
            values.push(avgScore);
        });

        return { labels, values };
    }

    convertSentimentToScore(sentiment, score) {
        // Convert sentiment labels to numeric scores for charting
        switch (sentiment.toLowerCase()) {
            case 'positive':
                return Math.max(0.3, score || 0.7); // Ensure positive values are above neutral
            case 'negative':
                return Math.min(-0.3, -(score || 0.7)); // Ensure negative values are below neutral
            default:
                return 0; // Neutral
        }
    }

    getMoodChartColor(avgMood) {
        if (avgMood > 0.2) {
            return CONFIG.CHART_COLORS.POSITIVE;
        } else if (avgMood < -0.2) {
            return CONFIG.CHART_COLORS.NEGATIVE;
        } else {
            return CONFIG.CHART_COLORS.NEUTRAL;
        }
    }

    updateChartTheme(isDark = false) {
        if (!this.moodChart) return;

        const textColor = isDark ? '#fff' : '#666';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        this.moodChart.options.scales.x.ticks.color = textColor;
        this.moodChart.options.scales.y.ticks.color = textColor;
        this.moodChart.options.scales.y.grid.color = gridColor;

        this.moodChart.update();
    }

    destroyCharts() {
        if (this.moodChart) {
            this.moodChart.destroy();
            this.moodChart = null;
        }
    }
}
