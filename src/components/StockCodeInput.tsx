interface StockCodeInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function StockCodeInput({ value, onChange }: StockCodeInputProps) {
  return (
    <div className="relative max-w-md mx-auto">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="輸入股票代碼 (例: 2269)"
          className="w-full px-6 py-4 text-lg font-semibold text-gray-800 bg-white border-4 border-blue-400 rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all"
          maxLength={4}
        />
      </div>
    </div>
  );
}
