import { useState } from 'react';

export default function VideoTutorials() {
  const [selectedVideo, setSelectedVideo] = useState(0);

  const tutorials = [
    {
      id: 1,
      title: 'Create Your First Campaign in 5 Minutes',
      description: 'Learn how to set up a campaign and upload your first template',
      thumbnail: '🎬',
      duration: '5:32',
      videoId: 'jNQXAC9IVRw', // YouTube ID
      category: 'Beginner'
    },
    {
      id: 2,
      title: 'Design Pro Tips for Maximum Virality',
      description: 'Expert techniques to make your posters stand out',
      thumbnail: '🎨',
      duration: '12:15',
      videoId: 'jNQXAC9IVRw',
      category: 'Advanced'
    },
    {
      id: 3,
      title: 'Grow Your Reach with Bulk Sharing',
      description: 'Use WhatsApp and social media to scale your campaigns',
      thumbnail: '📱',
      duration: '8:45',
      videoId: 'jNQXAC9IVRw',
      category: 'Marketing'
    },
    {
      id: 4,
      title: 'Integrate Templates with Graphic Designers',
      description: 'Connect with professional designers and monetize templates',
      thumbnail: '👨‍🎨',
      duration: '10:20',
      videoId: 'jNQXAC9IVRw',
      category: 'Business'
    }
  ];

  const currentVideo = tutorials[selectedVideo];

  return (
    <section className="py-24 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-slate-900 mb-3">Learn & Master CampSend 🎓</h2>
          <p className="text-slate-600 font-medium">Video tutorials by experts. Everything you need to succeed.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Video Player */}
          <div className="lg:col-span-2">
            <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl mb-6">
              {/* YouTube Embed */}
              <div className="relative pt-[56.25%]">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=0&modestbranding=1`}
                  title={currentVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Duration Badge */}
              <div className="absolute top-3 right-3 bg-slate-900/80 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur">
                ⏱️ {currentVideo.duration}
              </div>
            </div>

            {/* Video Info */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">
                  {currentVideo.category}
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">{currentVideo.title}</h3>
              <p className="text-slate-600 font-medium">{currentVideo.description}</p>
            </div>

            {/* CTA Button */}
            <button className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30 active:scale-95">
              📖 View Full Tutorial Guide
            </button>
          </div>

          {/* Video Playlist */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 h-fit">
            <p className="font-black text-slate-900 mb-4 text-sm uppercase tracking-wider">📺 Tutorials</p>
            <div className="space-y-2">
              {tutorials.map((video, idx) => (
                <button
                  key={video.id}
                  onClick={() => setSelectedVideo(idx)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedVideo === idx
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-white border border-slate-200 text-slate-900 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl pt-1">{video.thumbnail}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm line-clamp-2">{video.title}</p>
                      <p className={`text-xs mt-1 ${selectedVideo === idx ? 'opacity-80' : 'text-slate-500'}`}>
                        {video.duration}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-linear-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 md:p-12 border border-indigo-100 text-center">
          <h3 className="text-2xl font-black text-slate-900 mb-3">Ready to Create Viral Campaigns?</h3>
          <p className="text-slate-600 font-medium mb-6">Start with our most-watched beginner tutorial</p>
          <button className="inline-block bg-indigo-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30 active:scale-95">
            🚀 Start Your Free Campaign
          </button>
        </div>
      </div>
    </section>
  );
}
