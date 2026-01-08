import React, { useState, useMemo } from 'react';
import { 
  UserPlus, LogOut, Download, Edit3, CheckCircle, Trash2, 
  BarChart2, Grid
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';

// --- Mock Data ---
const generateMockData = () => {
  const now = new Date();
  const pages = Array.from({ length: 20 }, (_, i) => ({
    id: `p-${i}`,
    index: i + 1,
    unitCount: 10,
    translatedCount: 10,
    proovedCount: 5,
    inboxCount: Math.floor(Math.random() * 12) + 2,
    outboxCount: Math.floor(Math.random() * 8) + 1,
  }));

  const assignments = [
    { userNickname: '小明', assignedTranslatorAt: now, assignedReviewerAt: now },
    { userNickname: '艾莉丝', assignedTranslatorAt: now, assignedProofreaderAt: now, assignedTypesetterAt: now },
    { userNickname: '老王', assignedRedrawerAt: now },
    { userNickname: '苏珊', assignedTranslatorAt: now }
  ];

  return {
    title: '幻象之城',
    author: '未知艺术家',
    coverImageUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?q=80&w=800&auto=format&fit=crop',
    collectionName: '奇幻系列',
    index: 1,
    description: '寻找失落记忆的故事。',
    isSeries: false,
    tags: [{ tagId: 't1', name: '赛博朋克' }, { tagId: 't2', name: '治愈' }],
    pageCount: 20,
    pages: pages,
    assignments: assignments,
  };
};

const mockComic = generateMockData();

// --- Compact Sub-components ---

const RoleRow = ({ label, users, isComplete = false }) => {
  const hasUsers = users.length > 0;
  let bgColor = "bg-transparent";
  let textColor = "text-stone-400";
  let dotColor = "bg-stone-200";

  if (hasUsers) {
    if (isComplete) {
      bgColor = "bg-emerald-50/40";
      textColor = "text-emerald-700";
      dotColor = "bg-emerald-400";
    } else {
      bgColor = "bg-orange-50/40";
      textColor = "text-orange-700";
      dotColor = "bg-orange-400";
    }
  }

  return (
    <div className={`flex items-center px-2 py-0.5 rounded transition-colors ${bgColor}`}>
      <div className={`w-1 h-1 rounded-full mr-2 ${dotColor}`} />
      <span className="text-[10px] font-bold w-10 text-stone-500 shrink-0">{label}：</span>
      <span className={`text-[10px] font-medium truncate ${textColor}`}>
        {hasUsers ? users.map(u => u.userNickname).join('、') : '未指派'}
      </span>
    </div>
  );
};

const CompactStat = ({ label, value }) => (
  <div className="flex flex-col border-l border-stone-100 pl-3 first:border-0 first:pl-0">
    <span className="text-[11px] font-bold text-stone-700 leading-none">{value}</span>
    <span className="text-[8px] text-stone-400 font-bold mt-1 uppercase tracking-tighter">{label}</span>
  </div>
);

export default function ComicDetailCard({ comic = mockComic, currentUser = '小明' }) {
  const [activeTab, setActiveTab] = useState('chart');

  const rolesData = useMemo(() => ({
    translators: comic.assignments.filter(a => a.assignedTranslatorAt),
    proofreaders: comic.assignments.filter(a => a.assignedProofreaderAt),
    typesetters: comic.assignments.filter(a => a.assignedTypesetterAt),
    redrawers: comic.assignments.filter(a => a.assignedRedrawerAt),
    reviewers: comic.assignments.filter(a => a.assignedReviewerAt),
  }), [comic.assignments]);

  const stats = useMemo(() => {
    return comic.pages.reduce((acc, p) => ({
      units: acc.units + p.unitCount,
      trans: acc.trans + p.translatedCount,
      proof: acc.proof + p.proovedCount,
      inbox: acc.inbox + p.inboxCount,
      outbox: acc.outbox + p.outboxCount,
    }), { units: 0, trans: 0, proof: 0, inbox: 0, outbox: 0 });
  }, [comic.pages]);

  const isUserInProject = comic.assignments.some(a => a.userNickname === currentUser);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f8f8f7] p-4 text-stone-700">
      <div className="flex w-full max-w-4xl h-[520px] bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        
        {/* Left Sidebar */}
        <div className="w-52 bg-stone-50/50 p-4 flex flex-col border-r border-stone-100">
          <div className="aspect-[3/4.2] rounded-lg overflow-hidden border border-stone-200 mb-4 shrink-0 shadow-sm bg-white">
            <img src={comic.coverImageUrl} className="w-full h-full object-cover" alt="Cover" />
          </div>

          <div className="flex flex-col gap-2 grow overflow-hidden">
            <button className={`w-full py-2 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-2 ${
              isUserInProject 
              ? 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50' 
              : 'bg-stone-900 text-white border-stone-800 hover:bg-stone-800'
            }`}>
              {isUserInProject ? <><LogOut size={12}/> 退出项目</> : <><UserPlus size={12}/> 加入项目</>}
            </button>
            
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-stone-200 text-stone-500 text-[10px] font-bold hover:bg-white">
                <Download size={11} /> 导出
              </button>
              <button className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-stone-200 text-stone-500 text-[10px] font-bold hover:bg-white">
                <Edit3 size={11} /> 修改
              </button>
            </div>

            <div className="mt-auto pt-3 flex flex-col gap-1 border-t border-stone-100">
              <button className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 py-1 px-1.5 rounded transition-colors">
                <CheckCircle size={11} /> 完结项目
              </button>
              <button className="flex items-center gap-2 text-[10px] font-bold text-red-400 hover:bg-red-50 py-1 px-1.5 rounded transition-colors">
                <Trash2 size={11} /> 删除项目
              </button>
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-w-0">
          
          <div className="px-6 py-4 flex justify-between items-end border-b border-stone-50 shrink-0">
            <div className="min-w-0">
              <div className="flex gap-2 mb-1">
                <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest">{comic.collectionName}</span>
                {comic.tags.map(t => <span key={t.tagId} className="text-[8px] font-bold text-blue-400 uppercase">#{t.name}</span>)}
              </div>
              <h1 className="text-lg font-bold text-stone-800 truncate leading-none mb-1">{comic.title}</h1>
              <p className="text-[9px] text-stone-400 tracking-tight font-medium">by {comic.author} · {comic.pageCount}P</p>
            </div>
            <div className="text-2xl font-black text-stone-100 italic leading-none select-none">#{comic.index}</div>
          </div>

          {/* Assignments & Metrics */}
          <div className="px-6 py-3 flex gap-8 items-start shrink-0 border-b border-stone-50/50">
            <div className="flex-1 flex flex-col gap-0.5">
              <RoleRow label="翻译" users={rolesData.translators} isComplete={stats.trans >= stats.units} />
              <RoleRow label="校对" users={rolesData.proofreaders} isComplete={stats.proof >= stats.units} />
              <RoleRow label="嵌字" users={rolesData.typesetters} />
              <RoleRow label="修图" users={rolesData.redrawers} />
              <RoleRow label="监修" users={rolesData.reviewers} />
            </div>
            <div className="w-48 flex flex-wrap gap-y-2 gap-x-4 border-l border-stone-100 pl-6 py-1">
              <CompactStat label="总单元" value={stats.units} />
              <CompactStat label="已翻译" value={stats.trans} />
              <CompactStat label="已校对" value={stats.proof} />
              <CompactStat label="框外" value={stats.outbox} />
              <CompactStat label="框内" value={stats.inbox} />
            </div>
          </div>

          {/* Visualization Area */}
          <div className="flex-1 px-6 py-4 flex flex-col min-h-0 bg-stone-50/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[9px] font-bold text-stone-300 uppercase tracking-[0.2em] flex items-center gap-2">
                {activeTab === 'chart' ? <BarChart2 size={10}/> : <Grid size={10}/>}
                Data Analytics
              </h3>
              <div className="flex bg-stone-200/40 p-0.5 rounded-lg border border-stone-200/50">
                <button onClick={() => setActiveTab('chart')} className={`px-4 py-1 rounded-md text-[9px] font-bold transition-all ${activeTab === 'chart' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`}>Chart</button>
                <button onClick={() => setActiveTab('preview')} className={`px-4 py-1 rounded-md text-[9px] font-bold transition-all ${activeTab === 'preview' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`}>Preview</button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-white rounded-xl border border-stone-100 p-3 shadow-inner">
              {activeTab === 'chart' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comic.pages.map(p => ({ p: `P${p.index}`, inbox: p.inboxCount, outbox: p.outboxCount }))} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f3f3f2" />
                    <XAxis dataKey="p" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#d6d3d1' }} interval={2} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#d6d3d1' }} />
                    <RechartsTooltip 
                      contentStyle={{ fontSize: '10px', borderRadius: '8px', border: '1px solid #f5f5f4', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}
                      itemStyle={{ padding: '0 2px' }}
                    />
                    <Area name="框内" type="monotone" dataKey="inbox" stroke="#10b981" fill="#10b981" fillOpacity={0.08} strokeWidth={2} dot={{ r: 1 }} />
                    <Area name="框外" type="monotone" dataKey="outbox" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} strokeWidth={2} dot={{ r: 1 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full overflow-y-auto pr-1 scrollbar-thin">
                  <div className="grid grid-cols-5 gap-3 w-full">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={i} className="relative aspect-[3/4] rounded-md bg-stone-50 border border-stone-100 overflow-hidden flex items-center justify-center group">
                        <img 
                          src={`https://placehold.co/150x200/fcfcfb/a8a29e?text=P${i+1}`} 
                          alt="p" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/5 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}