import { X, ExternalLink, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import AnalysisRenderer from './AnalysisRenderer';
import AIAccuracyChart from './AIAccuracyChart';

interface DiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: string;
  stockCode: string;
  stockName: string;
  onLineConversion: () => void;
  onReportDownload: () => void;
  isStreaming?: boolean;
  isConnecting?: boolean;
}

export default function DiagnosisModal({
  isOpen,
  onClose,
  analysis,
  stockCode,
  stockName,
  onLineConversion,
  onReportDownload,
  isStreaming = false,
  isConnecting = false,
}: DiagnosisModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const lastLengthRef = useRef(0);

  useEffect(() => {
    if (isStreaming && contentRef.current && analysis.length > lastLengthRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
      lastLengthRef.current = analysis.length;
    }
  }, [analysis, isStreaming]);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.setAttribute('data-modal-open', 'true');

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.removeAttribute('data-modal-open');
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-75" style={{ touchAction: 'none' }}>
      <div className="relative w-full max-w-3xl max-h-[90vh]">
        <div className="relative bg-white rounded-lg shadow-blue-glow-lg overflow-hidden border-2 border-blue-400/50" style={{ touchAction: 'auto' }}>
          <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 flex items-center justify-between">
          <div className="flex-1 text-center">
            <h2 className="text-lg font-bold text-white">
              {stockName}（{stockCode}）AIによる銘柄診断レポート
            </h2>
            {isConnecting && (
              <div className="flex items-center gap-2 text-white text-sm justify-center mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>接続中...</span>
              </div>
            )}
            {isStreaming && !isConnecting && (
              <div className="flex items-center gap-2 text-white text-sm justify-center mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>生成中...</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-600 rounded-full transition-colors ml-4"
            aria-label="閉じる"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div ref={contentRef} className="overflow-y-auto max-h-[calc(90vh-180px)] px-6 py-6">
          <div className="mb-6">
            <div className="mb-6 flex justify-center">
              <AIAccuracyChart />
            </div>

            <h3 className="text-xl font-bold text-blue-900 text-center mb-6">AI診断結果</h3>

            <div className="bg-blue-50 rounded-xl p-6 shadow-inner relative border border-blue-200">
              <div className="prose prose-sm max-w-none">
                {isConnecting ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-blue-900 font-semibold">AIサーバーに接続中...</p>
                    <p className="text-blue-600 text-sm mt-2">数秒お待ちください</p>
                  </div>
                ) : (
                  <div>
                    <AnalysisRenderer text={analysis} />
                    {isStreaming && (
                      <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1"></span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={onLineConversion}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-bold py-4 px-6 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-sm mt-6"
            >
              <ExternalLink className="w-5 h-5" />
              無料AI診断結果をLINEで毎日受け取る
            </button>

            <div className="mt-3 p-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg border border-green-600/30">
              <p className="text-xs text-green-700 leading-relaxed">
                LINEで登録すると、毎日最新の株式分析レポートをお届けします
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
