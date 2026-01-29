
import React, { useState, useEffect } from 'react';
import { getBlogPosts, getBlogPost, getInternalLinks, BlogPost } from '../services/blogService';
import { Loader2, Calendar, ArrowLeft, ArrowRight, Clock, Tag } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';

interface BlogPageProps {
  onBack: () => void;
  initialSlug?: string | null;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onBack, initialSlug }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail'>(initialSlug ? 'detail' : 'list');

  // Load posts on mount
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const data = await getBlogPosts();
        setPosts(data);
      } catch (err) {
        setError('Failed to load blog posts.');
      } finally {
        setLoading(false);
      }
    };

    if (view === 'list') {
      fetchPosts();
    }
  }, [view]);

  // Load single post if slug is present
  useEffect(() => {
    const fetchSinglePost = async () => {
      if (!initialSlug) return;
      
      setLoading(true);
      try {
        const [post, internalLinks] = await Promise.all([
          getBlogPost(initialSlug),
          getInternalLinks()
        ]);

        if (post) {
          // Process internal links
          let content = post.content || '';
          if (internalLinks.length > 0) {
            internalLinks.forEach(link => {
              const regex = new RegExp(`\\b(${link.keyword})\\b`, 'gi');
              content = content.replace(regex, `<a href="${link.url}" class="text-orange-500 hover:underline font-bold">$1</a>`);
            });
          }
          post.content = content;
          
          setCurrentPost(post);
          setView('detail');
        } else {
          setError('Post not found.');
          setView('list');
        }
      } catch (err) {
        setError('Failed to load post.');
        setView('list');
      } finally {
        setLoading(false);
      }
    };

    if (initialSlug) {
      fetchSinglePost();
    }
  }, [initialSlug]);

  const handlePostClick = async (slug: string) => {
    setLoading(true);
    window.history.pushState({}, '', `/blog/${slug}`);
    try {
      const [post, internalLinks] = await Promise.all([
        getBlogPost(slug),
        getInternalLinks()
      ]);

      if (post) {
         // Process internal links
         let content = post.content || '';
         if (internalLinks.length > 0) {
           internalLinks.forEach(link => {
             const regex = new RegExp(`\\b(${link.keyword})\\b`, 'gi');
             content = content.replace(regex, `<a href="${link.url}" class="text-orange-500 hover:underline font-bold">$1</a>`);
           });
         }
         post.content = content;

        setCurrentPost(post);
        setView('detail');
      }
    } catch (err) {
      setError('Failed to load post.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setView('list');
    setCurrentPost(null);
    window.history.pushState({}, '', '/blog');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // HEADER COMPONENT (Reused to match App structure)
  const Header = () => (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5 h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 safe-area-inset">
      <div className="cursor-pointer flex items-center gap-2" onClick={onBack}>
         <AnimatedLogo />
         <span className="text-zinc-500 text-sm font-mono hidden sm:inline">/ BLOG</span>
      </div>
      <button 
        onClick={onBack}
        className="text-xs font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back to App
      </button>
    </header>
  );

  if (loading && !posts.length && !currentPost) {
    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30 pt-20 pb-12">
      <Header />

      <main className="container mx-auto max-w-5xl px-4 sm:px-6">
        {error && (
            <div className="mb-8 p-4 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400 text-sm text-center">
                {error}
            </div>
        )}

        {view === 'list' ? (
          <div className="space-y-12">
            <div className="text-center space-y-4 mb-16">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-500">
                Latest <span className="text-orange-500">Insights</span>
              </h1>
              <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
                Tips, tricks, and strategies to beat the ATS and land your dream job.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {posts.map((post) => (
                <article 
                  key={post.slug}
                  className="group bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)] cursor-pointer flex flex-col"
                  onClick={() => handlePostClick(post.slug)}
                >
                  {post.featuredImage && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img 
                        src={post.featuredImage} 
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase tracking-wider rounded border border-orange-500/20">
                        {post.category || 'Career'}
                      </span>
                      <span className="text-zinc-500 text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(post.createdAt)}
                      </span>
                    </div>
                    
                    <h2 className="text-xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    
                    {post.metaDescription && (
                      <p className="text-zinc-400 text-sm line-clamp-3 mb-4 flex-1">
                        {post.metaDescription}
                      </p>
                    )}
                    
                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center text-sm font-bold text-zinc-500 group-hover:text-white transition-colors">
                      Read Article <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {posts.length === 0 && !loading && (
              <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                <p className="text-zinc-500">No posts found. Check back later!</p>
              </div>
            )}
          </div>
        ) : (
          <article className="max-w-3xl mx-auto">
             <button 
                onClick={handleBackToList}
                className="mb-8 text-sm font-bold text-zinc-500 hover:text-orange-500 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Articles
              </button>

            {currentPost && (
              <>
                <header className="mb-10 text-center">
                   <div className="flex items-center justify-center gap-3 mb-6">
                      <span className="px-3 py-1 bg-orange-500/10 text-orange-500 text-xs font-bold uppercase tracking-wider rounded-full border border-orange-500/20">
                        {currentPost.category || 'Career'}
                      </span>
                      <span className="text-zinc-500 text-sm flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(currentPost.createdAt)}
                      </span>
                   </div>
                   
                   <h1 className="text-3xl sm:text-5xl font-black text-white mb-6 leading-tight">
                     {currentPost.title}
                   </h1>

                   {currentPost.featuredImage && (
                    <div className="rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl mb-10">
                      <img 
                        src={currentPost.featuredImage} 
                        alt={currentPost.title}
                        className="w-full h-auto"
                      />
                    </div>
                   )}
                </header>

                {/* Content with Tailwind Typography (Prose) */}
                <div 
                  className="prose prose-invert prose-orange max-w-none 
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
                    prose-p:text-zinc-300 prose-p:leading-relaxed
                    prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-white
                    prose-ul:list-disc prose-ul:pl-6
                    prose-ol:list-decimal prose-ol:pl-6
                    prose-img:rounded-xl prose-img:border prose-img:border-zinc-800
                    prose-blockquote:border-l-4 prose-blockquote:border-orange-500 prose-blockquote:bg-zinc-900/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                    prose-code:bg-zinc-800 prose-code:text-orange-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                  "
                  dangerouslySetInnerHTML={{ __html: currentPost.content || '' }}
                />
              </>
            )}
          </article>
        )}
      </main>

      {/* Footer (Simplified for Blog) */}
      <footer className="mt-20 border-t border-white/5 py-12 bg-zinc-950 text-center">
        <div className="flex items-center justify-center gap-2 mb-4 opacity-50 grayscale hover:grayscale-0 transition-all">
          <AnimatedLogo />
        </div>
        <p className="text-zinc-600 text-xs">
          © {new Date().getFullYear()} HireSchema. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
