
import React, { useState, useEffect } from 'react';
import { getBlogPosts, getBlogPost, getInternalLinks, BlogPost } from '../services/blogService';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { FileData } from '../types';

interface BlogPageProps {
  onBack: () => void;
  initialSlug?: string | null;
  onNavigate: (intent: 'scan' | 'optimize' | 'launch' | 'roast' | 'blog' | 'feature' | 'pricing', file?: FileData, featureSlug?: string) => void;
}

export const BlogPage: React.FC<BlogPageProps> = ({ onBack, initialSlug, onNavigate }) => {
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
        const [post, internalLinks, allPosts] = await Promise.all([
          getBlogPost(initialSlug),
          getInternalLinks(),
          getBlogPosts()
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
          setPosts(allPosts);
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

  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    if (currentPost && posts.length > 0) {
        const otherPosts = posts.filter(p => p.slug !== currentPost.slug);
        const sameCategory = otherPosts.filter(p => p.category === currentPost.category);
        const diffCategory = otherPosts.filter(p => p.category !== currentPost.category);
        
        // Simple shuffle
        const shuffledSame = [...sameCategory].sort(() => 0.5 - Math.random());
        const shuffledDiff = [...diffCategory].sort(() => 0.5 - Math.random());
        
        // Prioritize same category, then fill with others
        const combined = [...shuffledSame, ...shuffledDiff];
        setRelatedPosts(combined.slice(0, 3));
    }
  }, [currentPost, posts]);

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

  // Featured Carousel Component
  const FeaturedCarousel = ({ featuredPosts }: { featuredPosts: BlogPost[] }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (featuredPosts.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % featuredPosts.length);
        }, 5000); // Rotate every 5 seconds
        return () => clearInterval(interval);
    }, [featuredPosts.length]);

    const nextSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % featuredPosts.length);
    };

    const prevSlide = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + featuredPosts.length) % featuredPosts.length);
    };

    if (featuredPosts.length === 0) return null;

    return (
        <div className="relative w-full aspect-[21/9] sm:aspect-[2.4/1] bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 group mb-20">
             {featuredPosts.map((post, index) => (
                 <div 
                    key={post.slug}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    onClick={() => handlePostClick(post.slug)}
                 >
                     {/* Background Image with Gradient Overlay */}
                     {post.featuredImage && (
                         <div className="absolute inset-0">
                             <img 
                                src={post.featuredImage} 
                                alt={post.title}
                                className="w-full h-full object-cover"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                             <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
                         </div>
                     )}
                     
                     {/* Content */}
                     <div className="absolute bottom-0 left-0 p-8 sm:p-12 max-w-3xl flex flex-col gap-4">
                         <div className="flex items-center gap-3 text-sm animate-in slide-in-from-left-4 fade-in duration-700 delay-100">
                             <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                                 {post.category || 'Featured'}
                             </span>
                             <span className="text-zinc-300 font-medium">{formatDate(post.createdAt)}</span>
                         </div>
                         
                         <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight tracking-tight drop-shadow-lg animate-in slide-in-from-left-4 fade-in duration-700 delay-200">
                             {post.title}
                         </h2>
                         
                         {post.metaDescription && (
                             <p className="text-zinc-300 text-lg line-clamp-2 max-w-2xl drop-shadow-md animate-in slide-in-from-left-4 fade-in duration-700 delay-300 hidden sm:block">
                                 {post.metaDescription}
                             </p>
                         )}

                         <div className="pt-4 animate-in slide-in-from-left-4 fade-in duration-700 delay-400">
                            <span className="inline-flex items-center gap-2 text-white font-semibold group-hover/btn:text-orange-400 transition-colors">
                                Read Article <ArrowRight className="w-4 h-4" />
                            </span>
                         </div>
                     </div>
                 </div>
             ))}

             {/* Controls */}
             {featuredPosts.length > 1 && (
                 <>
                    <div className="absolute bottom-8 right-8 z-20 flex gap-2">
                        <button 
                            onClick={prevSlide}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all hover:scale-105 active:scale-95 border border-white/10"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={nextSlide}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all hover:scale-105 active:scale-95 border border-white/10"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Indicators */}
                    <div className="absolute top-8 right-8 z-20 flex gap-1.5">
                        {featuredPosts.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-8 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'w-2 bg-white/20'}`} 
                            />
                        ))}
                    </div>
                 </>
             )}
        </div>
    );
  };

  if (loading && !posts.length && !currentPost) {
    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
        <Header onNavigate={onNavigate as any} />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-orange-500/30 pt-24 pb-12">
      <Header onNavigate={onNavigate as any} />
      
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[128px]" />
      </div>

      <main className="relative z-10 container mx-auto max-w-6xl px-6">
        {error && (
            <div className="mb-12 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
            </div>
        )}

        {view === 'list' ? (
          <div className="space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="py-20 border-b border-white/5">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 mb-6">
                   <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                   HireSchema Blog
                </div>
                <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6">
                  Latest <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">Insights</span>
                </h1>
                <p className="text-xl text-zinc-400 font-light leading-relaxed max-w-2xl">
                  Expert advice on resume optimization, ATS strategies, and career growth in the AI era.
                </p>
              </div>
            </div>

            {/* Featured Carousel */}
            {posts.length > 0 && (
                <FeaturedCarousel featuredPosts={posts.slice(0, 3)} />
            )}

            {/* Grid for the rest */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.slice(3).map((post, i) => (
                <article 
                  key={post.slug}
                  className="group cursor-pointer flex flex-col bg-zinc-900/20 border border-white/5 rounded-2xl overflow-hidden hover:border-orange-500/30 transition-all duration-300 hover:bg-zinc-900/40"
                  onClick={() => handlePostClick(post.slug)}
                >
                  {post.featuredImage && (
                    <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-900 relative">
                      <img 
                        src={post.featuredImage} 
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col gap-3 flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-orange-400 uppercase tracking-wider">
                        {post.category || 'Career'}
                      </span>
                      <span className="text-zinc-500">{formatDate(post.createdAt)}</span>
                    </div>
                    
                    <h2 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </h2>
                    
                    {post.metaDescription && (
                      <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3 flex-1">
                        {post.metaDescription}
                      </p>
                    )}
                    
                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 group-hover:text-white transition-colors">Read more</span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {posts.length === 0 && !loading && (
              <div className="text-center py-32 border-t border-white/5">
                <p className="text-zinc-600">No posts found.</p>
              </div>
            )}
          </div>
        ) : (
          <article className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
             <button 
                onClick={handleBackToList}
                className="mb-12 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-sm text-[10px] font-mono font-bold uppercase tracking-[0.2em] shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-2 group"
              >
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /> Back to Articles
              </button>

            {currentPost && (
              <>
                <header className="mb-16">
                   <div className="flex items-center gap-4 mb-6 text-sm text-zinc-500">
                      <span className="text-orange-500 font-medium uppercase tracking-wider">
                        {currentPost.category || 'Career'}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-800" />
                      <span>{formatDate(currentPost.createdAt)}</span>
                   </div>
                   
                   <h1 className="text-4xl sm:text-6xl font-semibold text-white mb-8 leading-[1.1] tracking-tight">
                     {currentPost.title}
                   </h1>

                   {currentPost.featuredImage && (
                    <div className="w-full aspect-[21/9] overflow-hidden rounded-sm bg-zinc-900 mb-12">
                      <img 
                        src={currentPost.featuredImage} 
                        alt={currentPost.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                   )}
                </header>

                <div 
                  className="prose prose-invert prose-sm sm:prose-lg max-w-none 
                    prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-white
                    prose-p:text-zinc-400 prose-p:leading-8 prose-p:font-light
                    prose-a:text-white prose-a:underline prose-a:decoration-zinc-700 prose-a:underline-offset-4 hover:prose-a:decoration-orange-500 hover:prose-a:text-orange-400 transition-all
                    prose-strong:text-white prose-strong:font-medium
                    prose-ul:list-disc prose-ul:pl-0 prose-ul:text-zinc-400
                    prose-li:pl-2
                    prose-img:rounded-sm prose-img:grayscale-[0.5] hover:prose-img:grayscale-0 transition-all
                    prose-blockquote:border-l-2 prose-blockquote:border-white/20 prose-blockquote:pl-6 prose-blockquote:text-zinc-300 prose-blockquote:italic
                    prose-code:bg-white/10 prose-code:text-zinc-200 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                  "
                  dangerouslySetInnerHTML={{ __html: currentPost.content || '' }}
                />
                
                <div className="mt-20 pt-12 border-t border-white/5">
                    <h3 className="text-2xl font-bold text-white mb-8">Read Next</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {relatedPosts.map((post) => (
                             <article 
                                key={post.slug}
                                className="group cursor-pointer flex flex-col bg-zinc-900/20 border border-white/5 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all duration-300 hover:bg-zinc-900/40"
                                onClick={() => handlePostClick(post.slug)}
                             >
                                {post.featuredImage && (
                                    <div className="aspect-[16/10] w-full overflow-hidden bg-zinc-900 relative">
                                        <img 
                                            src={post.featuredImage} 
                                            alt={post.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                                        />
                                    </div>
                                )}
                                <div className="p-4 flex flex-col gap-2 flex-1">
                                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                                        <span className="font-semibold text-orange-400 uppercase tracking-wider">
                                            {post.category || 'Career'}
                                        </span>
                                        <span>{formatDate(post.createdAt)}</span>
                                    </div>
                                    <h4 className="text-base font-bold text-zinc-100 group-hover:text-white transition-colors leading-snug line-clamp-2">
                                        {post.title}
                                    </h4>
                                </div>
                             </article>
                        ))}
                    </div>
                    <div className="mt-12 text-center">
                        <button onClick={handleBackToList} className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">
                            &larr; View All Articles
                        </button>
                    </div>
                </div>
              </>
            )}
          </article>
        )}
      </main>

      <Footer onNavigate={onNavigate as any} />
    </div>
  );
};

export default BlogPage;
