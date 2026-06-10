import { toBlob } from 'html-to-image';

/**
 * Captures any DOM element (e.g., a chart card div with titles and legends) 
 * and copies it directly to the system clipboard as a high-quality PNG image.
 * 
 * @param element The HTML element to capture.
 */
export const copyElementToClipboard = async (element: HTMLElement): Promise<void> => {
  // Query all camera export buttons inside the element to hide them from the captured image
  const exportButtons = element.querySelectorAll('button[title*="Exportar"], button[title*="exportar"]');
  exportButtons.forEach((btn) => {
    (btn as HTMLElement).style.visibility = 'hidden';
  });

  try {
    const blob = await toBlob(element, {
      quality: 0.98,
      pixelRatio: 2, // 2x scale up for high-resolution retina copy
      backgroundColor: '#0c102b', 
      style: {
        borderRadius: '14px',
        transform: 'scale(1)', // prevent browser scaling quirks
      },
    });

    if (!blob) {
      throw new Error('Failed to generate PNG blob.');
    }

    // Write to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);
  } catch (error) {
    console.error('Error copying element to clipboard:', error);
    throw error; // Propagate error so components can handle feedback
  } finally {
    // Restore the buttons visibility after render
    exportButtons.forEach((btn) => {
      (btn as HTMLElement).style.visibility = 'visible';
    });
  }
};
