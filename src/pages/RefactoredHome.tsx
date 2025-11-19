import { useState, useEffect, useRef } from 'react';
import VideoBackground from '../components/VideoBackground';
import RobotHeaderAnimation from '../components/RobotHeaderAnimation';
import StockCodeInput from '../components/StockCodeInput';
import DynamicAIPrompt from '../components/DynamicAIPrompt';
import DiagnosisButton from '../components/DiagnosisButton';
import DiagnosisLoadingOverlay from '../components/DiagnosisLoadingOverlay';
import DiagnosisModal from '../components/DiagnosisModal';
import ApiStatsDisplay from '../components/ApiStatsDisplay';
import AIAnalysisBanner from '../components/AIAnalysisBanner';
import { StockData } from '../types/stock';
import { DiagnosisState } from '../types/diagnosis';
import { useUrlParams } from '../hooks/useUrlParams';
import { apiClient } from '../lib/apiClient';
import { userTracking } from '../lib/userTracking';
import { trackConversion, trackDiagnosisButtonClick, trackConversionButtonClick } from '../lib/googleTracking';
import { generateDiagnosisReport } from '../lib/reportGenerator';

export default function RefactoredHome() {
  const urlParams = useUrlParams();
  const [stockCode, setStockCode] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [diagnosisState, setDiagnosisState] = useState<DiagnosisState>('initial');
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [diagnosisStartTime, setDiagnosisStartTime] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState<boolean>(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (urlParams.code) {
      setStockCode(urlParams.code);
      setInputValue(urlParams.code);
      fetchStockData(urlParams.code);
    }
  }, [urlParams.code]);

  useEffect(() => {
    const trackPageVisit = async () => {
      if (stockData) {
        await userTracking.trackPageLoad({
          stockCode: stockCode,
          stockName: stockData.info.name,
          urlParams: {
            src: urlParams.src || '',
            gclid: urlParams.gclid || '',
            racText: urlParams.racText || '',
            code: urlParams.code || ''
          }
        });
      }
    };

    trackPageVisit();
  }, [stockData, stockCode, urlParams]);

  const fetchStockData = async (code: string) => {
    const cleanCode = code.replace(/[^\d]/g, '');

    if (!cleanCode || !/^\d{4}$/.test(cleanCode)) {
      setStockData(null);
      setStockCode(cleanCode);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/api/stock/data?code=${cleanCode}`);

      if (!response.ok) {
        setStockData(null);
        setStockCode(cleanCode);
        setError(null);
        return;
      }

      const data = await response.json();
      setStockData(data);
      setStockCode(cleanCode);
      setError(null);
    } catch (err) {
      setStockData(null);
      setStockCode(cleanCode);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleStockSelect = (code: string, name: string) => {
    setStockCode(code);
    fetchStockData(code);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue) {
        fetchStockData(inputValue);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const runDiagnosis = async () => {
    if (diagnosisState !== 'initial') return;
    if (!stockCode || !stockData) return;

    trackDiagnosisButtonClick();

    setDiagnosisState('connecting');
    setDiagnosisStartTime(Date.now());
    setAnalysisResult('');
    setLoadingProgress(0);
    setShowLoadingOverlay(true);

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev < 85) {
          return prev + Math.random() * 15;
        } else if (prev < 95) {
          return prev + Math.random() * 2;
        }
        return prev;
      });
    }, 100);

    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || ''}/api/gemini/diagnosis`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: stockCode,
          stockData: stockData ? {
            name: stockData.info.name,
            price: stockData.info.price,
            change: stockData.info.change,
            changePercent: stockData.info.changePercent,
            per: stockData.info.per,
            pbr: stockData.info.pbr,
            dividend: stockData.info.dividend,
            industry: stockData.info.industry,
            marketCap: stockData.info.marketCap,
          } : null,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (!response.ok) {
        throw new Error('AI診断に失敗しました');
      }

      setDiagnosisState('processing');

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullAnalysis = '';
        let firstChunk = true;

        if (!reader) {
          throw new Error('ストリーム読み取りに失敗しました');
        }

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              try {
                const parsed = JSON.parse(data);

                if (parsed.error) {
                  throw new Error(parsed.error);
                }

                if (parsed.content) {
                  fullAnalysis += parsed.content;

                  if (firstChunk && fullAnalysis.trim().length > 0) {
                    setLoadingProgress(100);
                    setTimeout(() => {
                      setShowLoadingOverlay(false);
                      setDiagnosisState('streaming');
                    }, 600);
                    firstChunk = false;
                  }

                  setAnalysisResult(fullAnalysis);
                }

                if (parsed.done) {
                  setDiagnosisState('results');

                  const durationMs = Date.now() - diagnosisStartTime;
                  await userTracking.trackDiagnosisClick({
                    stockCode: inputValue,
                    stockName: stockData?.info.name || inputValue,
                    durationMs: durationMs
                  });
                }
              } catch (parseError) {
                console.error('Error parsing SSE data:', parseError);
              }
            }
          }
        }
      } else {
        const result = await response.json();

        if (!result.analysis || result.analysis.trim() === '') {
          throw new Error('診断結果が生成されませんでした');
        }

        setAnalysisResult(result.analysis);
        setDiagnosisState('results');

        const durationMs = Date.now() - diagnosisStartTime;
        await userTracking.trackDiagnosisClick({
          stockCode: inputValue,
          stockName: stockData?.info.name || inputValue,
          durationMs: durationMs
        });
      }
    } catch (err) {
      console.error('Diagnosis error:', err);
      let errorMessage = '診断中にエラーが発生しました';
      let errorDetails = '';

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'リクエストがタイムアウトしました';
          errorDetails = '接続に時間がかかりすぎています。もう一度お試しください。';
        } else {
          errorMessage = err.message;

          try {
            const errorResponse = JSON.parse(err.message);
            if (errorResponse.details) {
              errorDetails = errorResponse.details;
            }
          } catch {
            errorDetails = err.message;
          }
        }
      }

      setError(`${errorMessage}${errorDetails ? `\n詳細: ${errorDetails}` : ''}`);
      setDiagnosisState('error');
      setShowLoadingOverlay(false);
      setLoadingProgress(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const handleLineConversion = async () => {
    try {
      trackConversionButtonClick();

      const response = await apiClient.get('/api/line-redirects/select');

      if (!response.ok) {
        console.error('Failed to get LINE redirect link');
        alert('LINEリンクの取得に失敗しました。しばらくしてからもう一度お試しください。');
        return;
      }

      const data = await response.json();

      if (!data.success || !data.link) {
        console.error('No active LINE redirect links available');
        alert('現在利用可能なLINEリンクがありません。');
        return;
      }

      const lineUrl = data.link.redirect_url;

      trackConversion();

      await userTracking.trackConversion({
        gclid: urlParams.gclid
      });

      console.log('LINE conversion tracked successfully');

      setTimeout(() => {
        window.location.href = lineUrl;
      }, 300);
    } catch (error) {
      console.error('LINE conversion error:', error);
      alert('操作に失敗しました。しばらくしてからもう一度お試しください。');
    }
  };

  const handleReportDownload = async () => {
    try {
      const response = await apiClient.get('/api/line-redirects/select');
      let lineRedirectUrl = '';

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.link) {
          lineRedirectUrl = data.link.redirect_url;
        }
      }

      await generateDiagnosisReport({
        stockCode: stockCode,
        stockName: stockData?.info.name || '',
        analysis: analysisResult,
        lineRedirectUrl: lineRedirectUrl
      });

      await userTracking.trackEvent({
        sessionId: sessionStorage.getItem('sessionId') || '',
        eventType: 'report_download',
        stockCode: stockCode,
        stockName: stockData?.info.name || '',
        eventData: {
          reportFormat: 'docx',
          timestamp: new Date().toISOString()
        }
      });

      console.log('Report download tracked successfully');
    } catch (error) {
      console.error('Report download error:', error);
      alert('レポートのダウンロードに失敗しました。もう一度お試しください。');
    }
  };

  const closeModal = () => {
    setDiagnosisState('initial');
    setAnalysisResult('');
    setLoadingProgress(0);
    setShowLoadingOverlay(false);
    setDiagnosisStartTime(0);
    setError(null);

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  return (
    <div className="min-h-screen relative">
      <VideoBackground />

      <div className="relative z-10 min-h-screen flex flex-col">
        <ApiStatsDisplay />

        <div className="flex-grow flex flex-col items-center justify-center px-4 py-12 space-y-8 md:space-y-12">
          <div className="flex flex-col items-center space-y-6">
            <RobotHeaderAnimation />
          </div>

          <AIAnalysisBanner />

          <div className="w-full max-w-2xl space-y-6">
            <StockCodeInput
              value={inputValue}
              onChange={setInputValue}
              onStockSelect={handleStockSelect}
            />

            <DynamicAIPrompt
              stockName={stockData?.info.name}
              stockCode={stockCode}
              onStockNameClick={() => {
                if (stockCode) {
                  setInputValue(stockCode);
                }
              }}
            />

            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-blue-500"></div>
                <p className="mt-4 text-white font-semibold text-lg drop-shadow-lg">株価データを読み込んでいます...</p>
              </div>
            )}

            {error && diagnosisState !== 'error' && (
              <div className="bg-red-500/90 backdrop-blur-sm border-2 border-red-300 rounded-xl p-4 text-center">
                <p className="text-white font-semibold">{error}</p>
              </div>
            )}

            {inputValue && !loading && diagnosisState === 'initial' && (
              <DiagnosisButton onClick={runDiagnosis} />
            )}

            {diagnosisState === 'error' && (
              <div className="bg-red-900/80 backdrop-blur-sm border-2 border-red-500 rounded-xl p-6 text-center">
                <h3 className="text-xl font-bold text-red-300 mb-3">診断エラー</h3>
                <p className="text-red-200 font-semibold mb-4 whitespace-pre-line">{error}</p>
                <button
                  onClick={() => {
                    setDiagnosisState('initial');
                    setError(null);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-all shadow-lg"
                >
                  もう一度試す
                </button>
              </div>
            )}
          </div>
        </div>

        <DiagnosisLoadingOverlay
          isVisible={showLoadingOverlay}
          progress={loadingProgress}
          onComplete={() => setShowLoadingOverlay(false)}
        />

        <DiagnosisModal
          isOpen={diagnosisState === 'streaming' || diagnosisState === 'results'}
          onClose={closeModal}
          analysis={analysisResult}
          stockCode={inputValue}
          stockName={stockData?.info.name || inputValue}
          onLineConversion={handleLineConversion}
          onReportDownload={handleReportDownload}
          isStreaming={diagnosisState === 'streaming'}
          isConnecting={diagnosisState === 'connecting'}
        />
      </div>
    </div>
  );
}
