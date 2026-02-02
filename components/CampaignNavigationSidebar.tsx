'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, MessageSquare, FileText, ChevronRight } from 'lucide-react';

interface NavigationSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  isVisible: boolean;
}

interface CampaignNavigationSidebarProps {
  sections: NavigationSection[];
}

export default function CampaignNavigationSidebar({ sections }: CampaignNavigationSidebarProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      // Find which section is currently in view
      const sectionElements = sections
        .filter(s => s.isVisible)
        .map(s => ({
          id: s.id,
          element: document.getElementById(s.id)
        }))
        .filter(s => s.element !== null);

      // Get the section that's most visible in the viewport
      let mostVisible = null;
      let mostVisibleRatio = 0;

      sectionElements.forEach(({ id, element }) => {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Calculate how much of the element is visible
        const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
        const ratio = visibleHeight / rect.height;
        
        if (ratio > mostVisibleRatio && rect.top < windowHeight * 0.5) {
          mostVisibleRatio = ratio;
          mostVisible = id;
        }
      });

      if (mostVisible) {
        setActiveSection(mostVisible);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Account for fixed header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const visibleSections = sections.filter(s => s.isVisible);

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-24 bg-white border border-fo-border rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-fo-dark mb-3 uppercase tracking-wide">
        Navigate Sections
      </h3>
      <nav className="space-y-1">
        {visibleSections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
              activeSection === section.id
                ? 'bg-fo-primary text-white font-semibold'
                : 'text-fo-text hover:bg-fo-light'
            }`}
          >
            <span className="flex-shrink-0">{section.icon}</span>
            <span className="flex-1 truncate">{section.title}</span>
            {activeSection === section.id && (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
          </button>
        ))}
      </nav>
      <div className="mt-4 pt-4 border-t border-fo-border">
        <p className="text-xs text-fo-text-secondary">
          {visibleSections.length} {visibleSections.length === 1 ? 'section' : 'sections'} visible
        </p>
      </div>
    </div>
  );
}
