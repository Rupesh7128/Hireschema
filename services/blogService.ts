
/// <reference types="vite/client" />

const BASE_URL = import.meta.env.VITE_MASSBLOG_URL || 'https://www.massblogger.com';
const API_KEY = import.meta.env.VITE_MASSBLOG_API;

export interface BlogPost {
  title: string;
  slug: string;
  category: string;
  featuredImage: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
  scheduleDate?: string;
}

export interface InternalLink {
  keyword: string;
  url: string;
}

export const getInternalLinks = async (): Promise<InternalLink[]> => {
  if (!API_KEY) return [];
  try {
    const response = await fetch(`${BASE_URL}/api/internal-links?apiKey=${API_KEY}`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching internal links:', error);
    return [];
  }
};

export const getBlogPosts = async (): Promise<BlogPost[]> => {
  if (!API_KEY) {
    console.warn('VITE_MASSBLOG_API is missing');
    return [];
  }

  try {
    console.log(`Fetching blog posts from: ${BASE_URL}/api/blog`);
    const response = await fetch(`${BASE_URL}/api/blog?apiKey=${API_KEY}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Blog API Error (${response.status}):`, text);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Blog posts fetched:', data.length);
    
    // Filter out future posts
    const now = new Date();
    return data.filter((post: BlogPost) => {
      if (!post.scheduleDate) return true;
      return new Date(post.scheduleDate) <= now;
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    // Return empty array to avoid crashing UI, but log error
    return [];
  }
};

export const getBlogPost = async (slug: string): Promise<BlogPost | null> => {
  if (!API_KEY) return null;

  try {
    const response = await fetch(`${BASE_URL}/api/blog?apiKey=${API_KEY}&slug=${slug}`);
    if (!response.ok) throw new Error('Failed to fetch post');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
};
