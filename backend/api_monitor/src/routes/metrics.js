import express from 'express';

const router = express.Router();

// Memory'den logları al (logs.js'den import edemeyiz, global kullanacağız)
const getMemoryLogs = () => {
    // logs.js'deki memoryLogs'a erişmek için global kullanıyoruz
    return global.memoryLogs || [];
};

// Özet istatistikler
router.get('/summary', async (req, res) => {
    try {
        const { projectId, startDate, endDate } = req.query;

        let logs = getMemoryLogs();

        // Filtreleme
        if (projectId) {
            logs = logs.filter(log => log.projectId === projectId);
        }
        if (startDate || endDate) {
            logs = logs.filter(log => {
                const logDate = new Date(log.timestamp);
                if (startDate && logDate < new Date(startDate)) return false;
                if (endDate && logDate > new Date(endDate)) return false;
                return true;
            });
        }

        const summary = {
            totalCalls: logs.length,
            successfulCalls: logs.filter(log => log.status === 'success').length,
            failedCalls: logs.filter(log => log.status === 'error').length,
            totalTokens: logs.reduce((sum, log) => sum + (log.totalTokens || 0), 0),
            totalCost: logs.reduce((sum, log) => sum + (log.cost || 0), 0),
            avgDuration: logs.length > 0
                ? logs.reduce((sum, log) => sum + (log.duration || 0), 0) / logs.length
                : 0
        };

        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Provider/Model bazlı breakdown
router.get('/by-provider', async (req, res) => {
    try {
        const { projectId } = req.query;

        let logs = getMemoryLogs();

        if (projectId) {
            logs = logs.filter(log => log.projectId === projectId);
        }

        const breakdown = {};

        logs.forEach(log => {
            const key = `${log.provider}:${log.model}`;
            if (!breakdown[key]) {
                breakdown[key] = {
                    _id: { provider: log.provider, model: log.model },
                    calls: 0,
                    tokens: 0,
                    cost: 0
                };
            }
            breakdown[key].calls++;
            breakdown[key].tokens += log.totalTokens || 0;
            breakdown[key].cost += log.cost || 0;
        });

        const result = Object.values(breakdown).sort((a, b) => b.cost - a.cost);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Zaman serisi verileri
router.get('/timeseries', async (req, res) => {
    try {
        const { projectId, interval = 'hour' } = req.query;

        let logs = getMemoryLogs();

        if (projectId) {
            logs = logs.filter(log => log.projectId === projectId);
        }

        const timeseries = {};

        logs.forEach(log => {
            const date = new Date(log.timestamp);
            let key;

            if (interval === 'hour') {
                key = `${date.getHours()}:00`;
            } else if (interval === 'day') {
                key = date.toISOString().split('T')[0];
            } else {
                key = date.toISOString();
            }

            if (!timeseries[key]) {
                timeseries[key] = {
                    _id: key,
                    calls: 0,
                    tokens: 0,
                    cost: 0
                };
            }

            timeseries[key].calls++;
            timeseries[key].tokens += log.totalTokens || 0;
            timeseries[key].cost += log.cost || 0;
        });

        const result = Object.values(timeseries)
            .sort((a, b) => a._id.localeCompare(b._id))
            .slice(-100); // Son 100 veri noktası

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Model bazlı zaman serisi (Multi-line chart için)
router.get('/timeseries-by-model', async (req, res) => {
    try {
        const { projectId, hours = 6 } = req.query; // Default to last 6 hours
        let logs = getMemoryLogs();

        if (projectId) logs = logs.filter(log => log.projectId === projectId);

        // 1. Tüm benzersiz modelleri bul
        const models = new Set();
        logs.forEach(log => {
            if (log.model) models.add(log.model);
        });
        const uniqueModels = Array.from(models);

        // 2. Son N saatin saat dilimlerini oluştur
        const timeMap = {};
        const now = new Date();
        const hoursCount = parseInt(hours);

        // Son N saat için döngü (Şimdiki saatten geriye doğru)
        for (let i = hoursCount - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - (i * 60 * 60 * 1000));
            const hourKey = `${d.getHours()}:00`;

            timeMap[hourKey] = { name: hourKey };
            // Her model için başlangıçta 0 ata
            uniqueModels.forEach(model => {
                timeMap[hourKey][model] = 0;
            });
        }

        // 3. Logları bu haritaya işle
        logs.forEach(log => {
            const date = new Date(log.timestamp);
            const hourKey = `${date.getHours()}:00`;

            // Eğer log son N saat içindeyse ve haritada varsa
            if (timeMap[hourKey]) {
                const modelKey = log.model || 'Unknown';
                if (typeof timeMap[hourKey][modelKey] === 'undefined') {
                    timeMap[hourKey][modelKey] = 0;
                }
                timeMap[hourKey][modelKey] += 1;
            }
        });

        // 4. Sonuç dizisini oluştur
        const result = [];
        for (let i = hoursCount - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - (i * 60 * 60 * 1000));
            const hourKey = `${d.getHours()}:00`;
            if (timeMap[hourKey]) {
                result.push(timeMap[hourKey]);
            }
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dashboard için tüm verileri tek seferde getir (Enterprise Layout için)
router.get('/dashboard', async (req, res) => {
    try {
        const { projectId } = req.query;
        let logs = getMemoryLogs();

        if (projectId) {
            logs = logs.filter(log => log.projectId === projectId);
        }

        // --- 1. TOP METRICS ---
        const totalReqs = logs.length;
        const totalCost = logs.reduce((acc, log) => acc + (log.cost || 0), 0);
        const totalPrompt = logs.reduce((acc, log) => acc + (log.promptTokens || 0), 0);
        const totalComp = logs.reduce((acc, log) => acc + (log.completionTokens || 0), 0);
        const totalTokens = logs.reduce((acc, log) => acc + (log.totalTokens || 0), 0);

        const latencies = logs.filter(l => l.duration > 0).map(l => l.duration);
        const avgLatency = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

        const metrics = {
            avgCost: totalReqs ? totalCost / totalReqs : 0,
            avgPrompt: totalReqs ? totalPrompt / totalReqs : 0,
            avgComp: totalReqs ? totalComp / totalReqs : 0,
            avgTotal: totalReqs ? totalTokens / totalReqs : 0,
            totalRequests: totalReqs,
            totalCost: totalCost,
            users: new Set(logs.map(l => l.projectId)).size,
            avgLatency: avgLatency
        };

        // --- 2. CHART TREND DATA (Last 14 Days) ---
        const getPastDates = (days) => {
            const dates = [];
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                dates.push(d.toLocaleDateString('en-GB'));
            }
            return dates;
        };

        const dateSlots = getPastDates(14);
        const dailyData = dateSlots.map(date => ({
            date,
            requests: 0,
            cost: 0,
            users: new Set(),
            latencySum: 0,
            latencyCount: 0
        }));

        logs.forEach(log => {
            const logDate = new Date(log.timestamp).toLocaleDateString('en-GB');
            const slot = dailyData.find(d => d.date === logDate);
            if (slot) {
                slot.requests++;
                slot.cost += (log.cost || 0);
                slot.users.add(log.projectId);
                if (log.duration) {
                    slot.latencySum += log.duration;
                    slot.latencyCount++;
                }
            }
        });

        const trendData = dailyData.map(d => ({
            ...d,
            users: d.users.size,
            avgLatency: d.latencyCount ? d.latencySum / d.latencyCount : 0
        }));

        // --- 3. STATS (Errors, Providers, Models) ---
        const errCounts = { '400': 0, '404': 0, '500': 0, 'cancelled': 0 };
        const provCounts = {};
        const modCounts = {};
        const costModCounts = {};

        logs.forEach(log => {
            // Errors
            if (log.status !== 'success') {
                if (log.error?.code === 400 || log.statusCode === 400) errCounts['400']++;
                else if (log.error?.code === 404 || log.statusCode === 404) errCounts['404']++;
                else if (log.error?.code === 500 || log.statusCode === 500) errCounts['500']++;
                else errCounts['cancelled']++;
            }
            // Providers
            const p = log.provider || 'unknown';
            provCounts[p] = (provCounts[p] || 0) + 1;
            // Models
            const m = log.model || 'unknown';
            modCounts[m] = (modCounts[m] || 0) + 1;
            costModCounts[m] = (costModCounts[m] || 0) + (log.cost || 0);
        });

        // Format Stats
        const totalErrors = Object.values(errCounts).reduce((a, b) => a + b, 0);
        const errorStats = Object.entries(errCounts).map(([key, val]) => ({
            name: key,
            value: val,
            percent: totalErrors ? (val / totalErrors) * 100 : 0
        })).filter(e => e.value > 0);

        const providerStats = Object.entries(provCounts)
            .map(([name, val]) => ({ name, value: val }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        const modelStats = Object.entries(modCounts)
            .map(([name, val]) => ({ name, value: val }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        const costModelStats = Object.entries(costModCounts)
            .map(([name, val]) => ({ name, value: val }))
            .sort((a, b) => b.value - a.value).slice(0, 5);

        res.json({
            metrics,
            trendData,
            stats: {
                errorStats,
                providerStats,
                modelStats,
                costModelStats
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
