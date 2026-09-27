import { useBoardStore } from '../store/useBoardStore';

const categoryIcons: Record<string, string> = {
  "Onlayn do'konlar va Savdo": "🛒",
  "Ta'lim va O'quv markazlari": "📚",
  "Biznes, Moliya va Huquq": "💼",
  "IT va Dasturlash": "💻",
  "Yangiliklar va OAV (Media)": "📰",
  "Tibbiyot va Salomatlik": "🏥",
  "Ko'chmas mulk va Qurilish": "🏠",
  "Sayohat va Turizm": "✈️",
  "Xizmat ko'rsatish va Agentliklar": "🛠",
  "Marketing va Reklama": "🎯",
  "Ish, Karyera va Vakansiyalar": "🤝",
  "Ijtimoiy tarmoqlar va Bloging": "📱",
  "Dizayn va Kreativ": "🎨",
  "O'yinlar va Ko'ngilochar": "🎮",
  "Neyrotarmoqlar va AI": "🤖",
  "Foydali vositalar (Tools)": "⚙️",
  "Boshqa": "📌"
};

export const categories = [
  "Onlayn do'konlar va Savdo",
  "Ta'lim va O'quv markazlari",
  "Biznes, Moliya va Huquq",
  "IT va Dasturlash",
  "Yangiliklar va OAV (Media)",
  "Tibbiyot va Salomatlik",
  "Ko'chmas mulk va Qurilish",
  "Sayohat va Turizm",
  "Xizmat ko'rsatish va Agentliklar",
  "Marketing va Reklama",
  "Ish, Karyera va Vakansiyalar",
  "Ijtimoiy tarmoqlar va Bloging",
  "Dizayn va Kreativ",
  "O'yinlar va Ko'ngilochar",
  "Neyrotarmoqlar va AI",
  "Foydali vositalar (Tools)",
  "Boshqa"
];

const Categories = () => {
  const { domains } = useBoardStore();

  return (
    <div className="bg-[#0f172a] pb-20 h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Barcha Kategoriyalar</h1>
          <p className="text-slate-400 text-lg">Kerakli sohani tanlang va top saytlarni ko'ring</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(c => {
            const count = domains.filter((d: any) => d.category === c).length;
            return (
              <a 
                key={c}
                href={`/?category=${encodeURIComponent(c)}`}
                className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-indigo-500 hover:bg-slate-800/80 transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {categoryIcons[c] || "📌"}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{c}</h3>
                    <p className="text-slate-400 text-sm">{count} ta sayt</p>
                  </div>
                </div>
                <div className="text-slate-500 group-hover:text-indigo-400 transition-colors">
                  ➔
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;
