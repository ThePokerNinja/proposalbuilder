import { useState, useEffect, useCallback } from 'react';
import { Code, X, Copy, Download, Check, ExternalLink, FileText, Image as ImageIcon, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';

export interface BuildVersion {
  id: string;
  version: string;
  name: string;
  createdAt: string;
  codeSnapshot?: string;
  description?: string;
  demoUrl?: string; // URL to open the demo in a new tab
  thumbnail?: string; // Base64 encoded thumbnail image
}

interface VersionManagerProps {
  currentVersion?: string;
  showEstimate?: boolean;
}

export function VersionManager({ currentVersion = 'v.92', showEstimate = false }: VersionManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<BuildVersion[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Capture thumbnail of the current page
  const captureThumbnail = useCallback(async (): Promise<string | undefined> => {
    try {
      // Capture the main content area (excluding fixed elements like VersionManager buttons)
      const mainContent = document.querySelector('.portfolio-bg') || document.body;
      if (!mainContent) return undefined;

      const canvas = await html2canvas(mainContent as HTMLElement, {
        height: 600,
        width: 1200,
        scale: 0.5,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });

      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (error) {
      console.error('Failed to capture thumbnail:', error);
      return undefined;
    }
  }, []);

  // Save a version programmatically
  const saveVersion = useCallback(async (versionData: Omit<BuildVersion, 'id' | 'createdAt'>) => {
    // Capture thumbnail if not provided
    const thumbnail = versionData.thumbnail || await captureThumbnail();
    
    const newVersion: BuildVersion = {
      ...versionData,
      id: versionData.version.replace(/[^a-zA-Z0-9]/g, ''), // Remove dots and special chars
      createdAt: new Date().toISOString(),
      demoUrl: versionData.demoUrl || window.location.origin + window.location.pathname,
      thumbnail,
    };
    
    setVersions(prev => {
      // Check if version already exists, update it if so
      const existingIndex = prev.findIndex(v => v.id === newVersion.id);
      let updated;
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = newVersion;
      } else {
        updated = [...prev, newVersion];
      }
      localStorage.setItem('build-versions', JSON.stringify(updated));
      return updated;
    });
    
    return newVersion;
  }, [captureThumbnail]);

  // Expose saveVersion to window for programmatic access
  useEffect(() => {
    (window as any).__saveBuildVersion = saveVersion;
    return () => {
      delete (window as any).__saveBuildVersion;
    };
  }, [saveVersion]);

  // Initialize with v.9 if no versions exist
  useEffect(() => {
    const stored = localStorage.getItem('build-versions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as BuildVersion[];
        // Ensure all versions have demoUrl - migrate old versions
        const migrated: BuildVersion[] = parsed.map(version => ({
          ...version,
          demoUrl: version.demoUrl || window.location.origin + window.location.pathname,
        }));
        
        // Check if v.9 exists, if not or if it needs update, save it
        const v9Exists = migrated.find(v => v.version === 'v.9');
        if (!v9Exists) {
          // Save v.9 as archived version
          const v9: BuildVersion = {
            id: 'v9',
            version: 'v.9',
            name: 'Version 9',
            createdAt: new Date().toISOString(),
            description: 'Progressive card flow with complete question handling, Generate Estimate button, and full progress tracking',
            demoUrl: window.location.origin + window.location.pathname,
          };
          migrated.push(v9);
        }
        
        // Check if v.91 exists, update it with current state (archived)
        const v91Exists = migrated.find(v => v.version === 'v.91');
        if (v91Exists) {
          // Update v.91 description to reflect archived state
          v91Exists.description = 'Two-column layout with estimate: Left column (30% width) contains two stacked cards (basic fields + research, and discovery questions). Right column (35% width) contains estimate visualization. Gap (2rem) centered horizontally. Full progress tracking and Generate Estimate button.';
        } else {
          // Save v.91 as archived version
          const v91: BuildVersion = {
            id: 'v91',
            version: 'v.91',
            name: 'Version 91',
            createdAt: new Date().toISOString(),
            description: 'Two-column layout with estimate: Left column (30% width) contains two stacked cards (basic fields + research, and discovery questions). Right column (35% width) contains estimate visualization. Gap (2rem) centered horizontally. Full progress tracking and Generate Estimate button.',
            demoUrl: window.location.origin + window.location.pathname,
          };
          migrated.push(v91);
        }
        
        // Check if v.92 exists, if not save it (current version)
        const v92Exists = migrated.find(v => v.version === 'v.92');
        if (!v92Exists) {
          // Save v.92 as current version
          const v92: BuildVersion = {
            id: 'v92',
            version: 'v.92',
            name: 'Version 92',
            createdAt: new Date().toISOString(),
            description: 'Two-column layout with estimate: Left column (30% width) contains two stacked cards. Right column (35% width) contains estimate visualization. Gap (2rem) centered horizontally.',
            demoUrl: window.location.origin + window.location.pathname,
          };
          migrated.push(v92);
        }
        
        setVersions(migrated);
        // Update localStorage with migrated versions
        localStorage.setItem('build-versions', JSON.stringify(migrated));
      } catch (e) {
        // If parsing fails, initialize with v.9
        initializeWithV9();
      }
    } else {
      initializeWithV9();
    }
  }, []);

  const initializeWithV9 = () => {
    const v9: BuildVersion = {
      id: 'v9',
      version: 'v.9',
      name: 'Version 9',
      createdAt: new Date().toISOString(),
      description: 'Progressive card flow with complete question handling, Generate Estimate button, and full progress tracking',
      demoUrl: window.location.origin + window.location.pathname, // Current URL
    };
    const v91: BuildVersion = {
      id: 'v91',
      version: 'v.91',
      name: 'Version 91',
      createdAt: new Date().toISOString(),
      description: 'Two-column layout with estimate: Left column (30% width) contains two stacked cards (basic fields + research, and discovery questions). Right column (35% width) contains estimate visualization. Gap (2rem) centered horizontally. Full progress tracking and Generate Estimate button.',
      demoUrl: window.location.origin + window.location.pathname, // Current URL
    };
    const v92: BuildVersion = {
      id: 'v92',
      version: 'v.92',
      name: 'Version 92',
      createdAt: new Date().toISOString(),
      description: 'Two-column layout with estimate: Left column (30% width) contains two stacked cards. Right column (35% width) contains estimate visualization. Gap (2rem) centered horizontally.',
      demoUrl: window.location.origin + window.location.pathname, // Current URL
    };
    setVersions([v9, v91, v92]);
    localStorage.setItem('build-versions', JSON.stringify([v9, v91, v92]));
  };

  const handleCopyCode = async (version: BuildVersion) => {
    if (version.codeSnapshot) {
      try {
        await navigator.clipboard.writeText(version.codeSnapshot);
        setCopiedId(version.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (e) {
        console.error('Failed to copy:', e);
      }
    }
  };

  const handleExportCode = (version: BuildVersion) => {
    if (version.codeSnapshot) {
      const blob = new Blob([version.codeSnapshot], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${version.version}-code.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Capture thumbnail for a specific version (helper function)
  const captureVersionThumbnail = useCallback(async (versionId: string) => {
    const thumbnail = await captureThumbnail();
    if (!thumbnail) return;

    setVersions(prev => {
      const updated = prev.map(v => 
        v.id === versionId ? { ...v, thumbnail } : v
      );
      localStorage.setItem('build-versions', JSON.stringify(updated));
      return updated;
    });
  }, [captureThumbnail]);


  return (
    <>
      {/* Fixed bottom icons */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Logo button (on estimate page) or Revert/Undo button (on landing page) */}
        {showEstimate ? (
          <button
            onClick={() => {
              // Refresh the page
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="group w-11 h-11 flex items-center justify-center bg-white/90 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-200/50 transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Refresh page"
            title="Refresh page"
          >
            <img 
              src={`${import.meta.env.BASE_URL}assets/logo.png`}
              alt="Logo"
              className="w-6 h-6 object-contain transition-all duration-200"
              style={{ filter: 'brightness(0) saturate(100%) invert(24%) sepia(8%) saturate(1352%) hue-rotate(202deg) brightness(94%) contrast(89%)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'none';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(0) saturate(100%) invert(24%) sepia(8%) saturate(1352%) hue-rotate(202deg) brightness(94%) contrast(89%)';
              }}
            />
          </button>
        ) : (
          <button
            onClick={() => {
              // Refresh the page
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="group p-3 bg-[#FFD700] hover:bg-[#FFC700] rounded-full shadow-lg border border-[#FFD700]/50 transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Revert/Refresh page"
            title="Revert/Refresh page"
          >
            <RotateCcw className="w-5 h-5 text-black transition-transform duration-300 group-hover:-rotate-180" />
          </button>
        )}
        
        {/* Estimate shortcut / Download button */}
        {showEstimate ? (
          <button
            onClick={() => {
              // Dispatch event to download SOW PDF
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('proposalbuilder:export-sow'));
              }
            }}
            className="p-3 bg-[#FFD700] hover:bg-[#FFC700] rounded-full shadow-lg border border-[#FFD700]/50 transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Download SOW PDF"
            title="Download SOW PDF"
          >
            <Download className="w-5 h-5 text-black" />
          </button>
        ) : (
          <button
            onClick={() => {
              // Dispatch event to navigate to estimate
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('proposalbuilder:show-estimate'));
              }
            }}
            className="p-3 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-200/50 transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Go to estimate"
            title="Go to estimate"
          >
            <FileText className="w-5 h-5 text-gray-700" />
          </button>
        )}
        
        {/* Archive button */}
        <button
          onClick={() => setIsOpen(true)}
          className="p-3 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full shadow-lg border border-gray-200/50 transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label="View build versions"
        >
          <Code className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Modal overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Build Versions</h2>
                <p className="text-sm text-gray-500 mt-1">Manage and access your build history</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Version list */}
            <div className="flex-1 overflow-y-auto p-6">
              {versions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Code className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No versions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version, index) => {
                    const previousVersion = index > 0 ? versions[index - 1] : null;
                    const hasDifference = previousVersion && (version.thumbnail || previousVersion.thumbnail);
                    
                    return (
                      <div
                        key={version.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          version.version === currentVersion
                            ? 'border-blue-500 bg-blue-50/50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left side: Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {version.name}
                              </h3>
                              <span
                                className={`px-2 py-1 rounded-md text-xs font-medium ${
                                  version.version === currentVersion
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {version.version}
                              </span>
                              {version.version === currentVersion && (
                                <span className="px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                                  Current
                                </span>
                              )}
                            </div>
                            {version.description && (
                              <p className="text-sm text-gray-600 mb-2">{version.description}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              Created: {formatDate(version.createdAt)}
                            </p>
                          </div>

                          {/* Right side: Thumbnail preview with difference */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Thumbnail comparison */}
                            {hasDifference && (
                              <div className="flex items-center gap-2">
                                {/* Previous version thumbnail */}
                                {previousVersion?.thumbnail && (
                                  <div className="relative group">
                                    <img
                                      src={previousVersion.thumbnail}
                                      alt={`${previousVersion.name} preview`}
                                      className="w-24 h-16 object-cover rounded-lg border-2 border-gray-200 opacity-60"
                                    />
                                    <div className="absolute inset-0 bg-blue-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="absolute -bottom-5 left-0 text-[9px] text-gray-500 whitespace-nowrap">
                                      Previous
                                    </span>
                                  </div>
                                )}
                                
                                {/* Arrow */}
                                <div className="flex flex-col items-center">
                                  <span className="text-xs text-gray-400 font-bold">→</span>
                                </div>
                                
                                {/* Current version thumbnail */}
                                {version.thumbnail && (
                                  <div className="relative group">
                                    <img
                                      src={version.thumbnail}
                                      alt={`${version.name} preview`}
                                      className="w-24 h-16 object-cover rounded-lg border-2 border-blue-300 shadow-sm"
                                    />
                                    <div className="absolute inset-0 bg-green-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <span className="absolute -bottom-5 left-0 text-[9px] text-gray-500 whitespace-nowrap">
                                      Current
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Single thumbnail if no previous version */}
                            {!hasDifference && version.thumbnail && (
                              <div className="relative group">
                                <img
                                  src={version.thumbnail}
                                  alt={`${version.name} preview`}
                                  className="w-24 h-16 object-cover rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Open thumbnail in new window for full view
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`<img src="${version.thumbnail}" style="max-width: 100%; height: auto;" />`);
                                    }
                                  }}
                                />
                                <div className="absolute top-1 right-1 bg-black/50 text-white text-[8px] px-1.5 py-0.5 rounded flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ImageIcon className="w-2.5 h-2.5" />
                                  Preview
                                </div>
                              </div>
                            )}

                            {/* Capture thumbnail button if no thumbnail exists */}
                            {!version.thumbnail && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await captureVersionThumbnail(version.id);
                                }}
                                className="w-24 h-16 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-colors group"
                                title="Capture thumbnail"
                              >
                                <ImageIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                              </button>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2">
                              {version.demoUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(version.demoUrl, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-blue-700 font-semibold bg-blue-100 hover:bg-blue-200 rounded-lg transition-all border-2 border-blue-300 hover:border-blue-400 hover:shadow-md whitespace-nowrap"
                                  title="Open demo in new tab"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  <span>View demo</span>
                                </button>
                              )}
                              {version.codeSnapshot && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyCode(version);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Copy code"
                                  >
                                    {copiedId === version.id ? (
                                      <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Copy className="w-4 h-4 text-gray-600" />
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExportCode(version);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Download code"
                                  >
                                    <Download className="w-4 h-4 text-gray-600" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500 text-center">
                Versions are stored locally in your browser
              </p>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
