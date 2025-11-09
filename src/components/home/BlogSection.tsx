'use client';

import React from 'react';
import Link from 'next/link';
import styles from './BlogSection.module.css';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  link: string;
}

interface BlogSectionProps {
  posts: BlogPost[];
}

export default function BlogSection({ posts }: BlogSectionProps) {
  if (posts.length === 0) return null;

  return (
    <section className={styles.blogSection}>
      <div className={styles.container}>
        <h2 className={styles.sectionTitle}>BLOG</h2>
        <div className={styles.blogGrid}>
          {posts.map((post) => (
            <Link 
              href={post.link} 
              key={post.id} 
              className={styles.blogCard}
            >
              <div 
                className={styles.blogImage}
                style={{ backgroundImage: `url(${post.image})` }}
              />
              <div className={styles.blogContent}>
                <div className={styles.blogDate}>{post.date}</div>
                <h3 className={styles.blogTitle}>{post.title}</h3>
                <p className={styles.blogExcerpt}>{post.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
