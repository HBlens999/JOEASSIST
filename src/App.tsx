import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { EntitlementsProvider } from './context/EntitlementsContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { UpgradeModal } from './components/UpgradeModal';

// Pages
import { HomePage } from './pages/HomePage';
import { TemplatesPage } from './pages/TemplatesPage';
import { CVBuilderPage } from './pages/CVBuilderPage';
import { CVUploadPage } from './pages/CVUploadPage';
import { ATSCheckerPage } from './pages/ATSCheckerPage';
import { CoverLetterPage } from './pages/CoverLetterPage';
import { BusinessDocsPage } from './pages/BusinessDocsPage';
import { PricingPage } from './pages/PricingPage';
import { UserDashboard } from './pages/UserDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { LegalPages } from './pages/LegalPages';
import { AuthPage } from './pages/AuthPage';
import { CVDocument } from './types/cv';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('modern_minimalist');
  const [cvToEdit, setCvToEdit] = useState<CVDocument | null>(null);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setCvToEdit(null);
  };

  const handleEditCV = (cv: CVDocument) => {
    setCvToEdit(cv);
    setSelectedTemplateId(cv.template_id);
  };

  const handleExtractedCV = (cv: CVDocument) => {
    setCvToEdit(cv);
    setSelectedTemplateId(cv.template_id);
  };

  return (
    <AuthProvider>
      <EntitlementsProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-900 antialiased selection:bg-blue-600 selection:text-white">
          {/* Top Navbar */}
          <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

          {/* Main Content Area */}
          <main className="flex-1">
            {currentTab === 'home' && (
              <HomePage 
                setCurrentTab={setCurrentTab} 
                onSelectTemplate={handleSelectTemplate} 
              />
            )}

            {currentTab === 'templates' && (
              <TemplatesPage 
                setCurrentTab={setCurrentTab} 
                onSelectTemplate={handleSelectTemplate} 
              />
            )}

            {currentTab === 'builder' && (
              <CVBuilderPage 
                initialTemplateId={selectedTemplateId} 
                setCurrentTab={setCurrentTab} 
                cvToEdit={cvToEdit} 
              />
            )}

            {currentTab === 'upload' && (
              <CVUploadPage 
                setCurrentTab={setCurrentTab} 
                onExtractedCV={handleExtractedCV} 
              />
            )}

            {currentTab === 'ats' && (
              <ATSCheckerPage setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'coverletter' && (
              <CoverLetterPage setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'business' && (
              <BusinessDocsPage setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'pricing' && (
              <PricingPage setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'dashboard' && (
              <UserDashboard 
                setCurrentTab={setCurrentTab} 
                onEditCV={handleEditCV} 
              />
            )}

            {currentTab === 'admin' && (
              <AdminDashboard setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'about' && (
              <AboutPage setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'contact' && (
              <ContactPage />
            )}

            {currentTab === 'privacy' && (
              <LegalPages type="privacy" setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'terms' && (
              <LegalPages type="terms" setCurrentTab={setCurrentTab} />
            )}

            {currentTab === 'auth' && (
              <AuthPage setCurrentTab={setCurrentTab} />
            )}
          </main>

          {/* Global Upgrade Paywall Modal */}
          <UpgradeModal />

          {/* Footer on non-builder full screens */}
          {currentTab !== 'builder' && (
            <Footer setCurrentTab={setCurrentTab} />
          )}
        </div>
      </EntitlementsProvider>
    </AuthProvider>
  );
}

export default App;
