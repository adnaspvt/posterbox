import { useState } from 'react';

const CAMPAIGN_TEMPLATES = [
  {
    id: 'event-promotion',
    title: 'Event Promotion',
    description: 'Eye-catching event flyer template',
    category: 'Events',
    thumbnail: '🎪',
    elements: [
      { type: 'text', text: 'EVENT NAME', fontSize: 48, color: '#FFFFFF', x: 50, y: 100 },
      { type: 'text', text: 'Date • Time • Location', fontSize: 24, color: '#FFFFFF', x: 50, y: 180 },
      { type: 'rect', width: 700, height: 100, color: '#FF6B6B', opacity: 0.8, x: 50, y: 300 }
    ]
  },
  {
    id: 'business-promo',
    title: 'Business Promotion',
    description: 'Professional business announcement',
    category: 'Business',
    thumbnail: '💼',
    elements: [
      { type: 'text', text: 'SPECIAL OFFER', fontSize: 56, color: '#1F2937', x: 50, y: 80 },
      { type: 'text', text: 'Limited Time Only', fontSize: 28, color: '#6B7280', x: 50, y: 160 },
      { type: 'rect', width: 300, height: 100, color: '#3B82F6', opacity: 1, x: 400, y: 300 }
    ]
  },
  {
    id: 'social-campaign',
    title: 'Social Media Campaign',
    description: 'Perfect for social media posts',
    category: 'Social Media',
    thumbnail: '📱',
    elements: [
      { type: 'text', text: 'FOLLOW US', fontSize: 52, color: '#EC4899', x: 50, y: 100 },
      { type: 'text', text: '@YourHandle', fontSize: 32, color: '#EC4899', x: 50, y: 180 }
    ]
  },
  {
    id: 'flash-sale',
    title: 'Flash Sale',
    description: 'Urgent sale announcement',
    category: 'Sales',
    thumbnail: '⚡',
    elements: [
      { type: 'text', text: 'FLASH SALE', fontSize: 60, color: '#F59E0B', x: 50, y: 100 },
      { type: 'text', text: 'UP TO 70% OFF', fontSize: 40, color: '#F59E0B', x: 50, y: 180 },
      { type: 'rect', width: 800, height: 150, color: '#000000', opacity: 0.1, x: 0, y: 0 }
    ]
  },
  {
    id: 'educational',
    title: 'Educational Content',
    description: 'Learning and course promotion',
    category: 'Education',
    thumbnail: '🎓',
    elements: [
      { type: 'text', text: 'LEARN TODAY', fontSize: 48, color: '#10B981', x: 50, y: 100 },
      { type: 'text', text: 'Master New Skills Online', fontSize: 28, color: '#10B981', x: 50, y: 180 }
    ]
  },
  {
    id: 'charity-drive',
    title: 'Charity Drive',
    description: 'Fundraising campaign template',
    category: 'Community',
    thumbnail: '❤️',
    elements: [
      { type: 'text', text: 'MAKE A DIFFERENCE', fontSize: 48, color: '#DC2626', x: 50, y: 100 },
      { type: 'text', text: 'Help Us Help Others', fontSize: 28, color: '#DC2626', x: 50, y: 180 }
    ]
  }
];

export default function CampaignTemplatesLibrary({ onTemplateSelect }) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', ...new Set(CAMPAIGN_TEMPLATES.map(t => t.category))];
  const filtered = selectedCategory === 'All' 
    ? CAMPAIGN_TEMPLATES 
    : CAMPAIGN_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Campaign Templates Library</h1>
        <p className="text-slate-500 mt-2 font-medium">Start with a professionally designed template and customize it for your needs.</p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(template => (
          <div
            key={template.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all overflow-hidden group cursor-pointer"
            onClick={() => onTemplateSelect(template)}
          >
            {/* Thumbnail */}
            <div className="h-40 bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-300">
              {template.thumbnail}
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="font-bold text-lg text-slate-800 mb-1">{template.title}</h3>
              <p className="text-sm text-slate-500 mb-4">{template.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  {template.category}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTemplateSelect(template);
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition"
                >
                  Use Template
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 font-medium">No templates in this category</p>
        </div>
      )}
    </div>
  );
}
