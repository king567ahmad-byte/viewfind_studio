/**
 * VIEW FIND STUDIO — Main Application Logic & Full Live Visual Editor System
 * Gives the user 100% complete live control to click and edit any text or image directly on the page!
 */

// Global Studio Configuration
let STUDIO_CONFIG = {
  studioName: "View Find Studio",
  tagline: "Pictures that outlive the moment.",
  subtagline: "A Lahore photography house for fashion and weddings.",
  location: "Lahore, Pakistan",
  whatsappNumber: "923000000000",
  phoneDisplay: "+92 300 0000000",
  rates: {
    singleEvent: 45000,
    threeEventBundle: 120000,
    drone: 25000,
    album: 20000,
    cinema: 35000,
    lookbook: 65000,
    campaign: 110000,
    ecommerce: 45000
  }
};

let isLiveEditing = false;
let activeImageTarget = null;
let currentPendingImageSrc = '';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  tagAllEditableAndImages();
  restoreSavedPageContent();
  initMobileMenu();
  initPortfolioFilter();
  initLightbox();
  initPriceCalculator();
  initContactForm();
  initDirectBookingForm();
  initFaqAccordion();
  initCookieConsent();
  initFullLiveVisualEditor();
  initAdminModal();
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Deterministically tag all text and image elements so they can be saved and restored
function tagAllEditableAndImages() {
  let textIdx = 0;
  const textSelectors = 'h1, h2, h3, h4, h5, h6, p, blockquote, figcaption, .package-card span, .package-card li, .package-card div, nav a, footer span';
  document.querySelectorAll(textSelectors).forEach(el => {
    if (!el.closest('.live-editor-topbar') && !el.closest('#image-edit-modal') && !el.closest('#admin-modal-overlay') && !el.closest('#studio-lightbox')) {
      if (!el.hasAttribute('data-edit-key')) {
        textIdx++;
        el.setAttribute('data-edit-key', 'txt-' + textIdx);
      }
    }
  });

  let imgIdx = 0;
  document.querySelectorAll('img').forEach(img => {
    if (!img.closest('.live-editor-topbar') && !img.closest('#image-edit-modal') && !img.closest('#admin-modal-overlay') && !img.closest('#studio-lightbox')) {
      if (!img.hasAttribute('data-img-key')) {
        imgIdx++;
        img.setAttribute('data-img-key', 'img-' + imgIdx);
      }
    }
  });
}

// Restore Saved Live Content from LocalStorage
function restoreSavedPageContent() {
  const savedContent = localStorage.getItem('viewfind_live_page_content');
  if (savedContent) {
    try {
      const parsed = JSON.parse(savedContent);

      // Restore Studio Configuration
      if (parsed.config) {
        STUDIO_CONFIG = Object.assign({}, STUDIO_CONFIG, parsed.config);
        applyStudioConfigToUI();
      }

      // Restore text content by deterministic edit keys
      if (parsed.texts) {
        Object.keys(parsed.texts).forEach(key => {
          const el = document.querySelector(`[data-edit-key="${key}"]`);
          if (el && parsed.texts[key]) {
            el.innerHTML = parsed.texts[key];
          }
        });
      }

      // Restore images by deterministic image keys
      if (parsed.images) {
        Object.keys(parsed.images).forEach(key => {
          const img = document.querySelector(`[data-img-key="${key}"]`);
          if (img && parsed.images[key]) {
            img.src = parsed.images[key];
          }
        });
      }
    } catch (e) {
      console.warn("Could not restore saved live content:", e);
    }
  } else {
    applyStudioConfigToUI();
  }
}

// Apply studio configuration across DOM
function applyStudioConfigToUI() {
  const cleanPhone = (STUDIO_CONFIG.whatsappNumber || "923000000000").replace(/[^0-9]/g, '');

  document.querySelectorAll('.cms-studio-name').forEach(el => {
    el.textContent = STUDIO_CONFIG.studioName || "View Find Studio";
  });

  document.querySelectorAll('.cms-whatsapp-link').forEach(link => {
    const defaultMsg = encodeURIComponent(`Hi ${STUDIO_CONFIG.studioName}! I would like to enquire about booking a shoot in Lahore.`);
    link.href = `https://wa.me/${cleanPhone}?text=${defaultMsg}`;
  });
}

// Mobile Navigation Toggle
function initMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const menuDrawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('close-mobile-menu');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (!menuBtn || !menuDrawer) return;

  function openMenu() {
    menuDrawer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    menuDrawer.classList.add('hidden');
    document.body.style.overflow = '';
  }

  menuBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  navLinks.forEach(l => l.addEventListener('click', closeMenu));
}

// Portfolio Filtering Logic
function initPortfolioFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const workItems = document.querySelectorAll('.work-grid-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('text-goldink', 'border-gold', 'font-semibold');
        b.classList.add('text-muted', 'border-transparent');
      });

      btn.classList.add('text-goldink', 'border-gold', 'font-semibold');
      btn.classList.remove('text-muted', 'border-transparent');

      const filterVal = btn.getAttribute('data-filter');

      workItems.forEach(item => {
        const cat = item.getAttribute('data-category');
        if (filterVal === 'all' || cat === filterVal) {
          item.style.display = 'block';
          item.style.opacity = '1';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

// Studio High-Res Lightbox Modal
let currentLightboxIdx = 0;
const allGalleryImages = [];

function initLightbox() {
  const lightbox = document.getElementById('studio-lightbox');
  const lightboxImg = document.getElementById('lightbox-image');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close-btn');
  const prevBtn = document.getElementById('lightbox-prev-btn');
  const nextBtn = document.getElementById('lightbox-next-btn');

  const clickableCards = document.querySelectorAll('.clickable-photo');

  clickableCards.forEach((card, idx) => {
    const img = card.querySelector('img');
    const title = card.getAttribute('data-title') || img?.alt || 'View Find Studio';
    if (img) {
      allGalleryImages.push({ src: img.src, title: title });
      card.addEventListener('click', (e) => {
        // If live editing is active, do not open lightbox; allow image replacement instead
        if (isLiveEditing) {
          e.preventDefault();
          e.stopPropagation();
          openImageChangerModal(img);
          return;
        }
        e.preventDefault();
        openLightboxAt(idx);
      });
    }
  });

  function openLightboxAt(index) {
    if (!lightbox || !lightboxImg || !allGalleryImages[index]) return;
    currentLightboxIdx = index;
    lightboxImg.src = allGalleryImages[index].src;
    if (lightboxCaption) lightboxCaption.textContent = allGalleryImages[index].title;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showNext() {
    currentLightboxIdx = (currentLightboxIdx + 1) % allGalleryImages.length;
    openLightboxAt(currentLightboxIdx);
  }

  function showPrev() {
    currentLightboxIdx = (currentLightboxIdx - 1 + allGalleryImages.length) % allGalleryImages.length;
    openLightboxAt(currentLightboxIdx);
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (nextBtn) nextBtn.addEventListener('click', showNext);
  if (prevBtn) prevBtn.addEventListener('click', showPrev);

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
  });
}

// Package Calculator
function initPriceCalculator() {
  const calcForm = document.getElementById('package-calculator-form');
  const totalDisplay = document.getElementById('calc-total-pkr');
  const bookBtn = document.getElementById('calc-whatsapp-btn');

  if (!calcForm || !totalDisplay) return;

  function calculateTotal() {
    let total = 0;
    const shootType = document.querySelector('input[name="shoot-type"]:checked')?.value || 'wedding';

    const rates = STUDIO_CONFIG.rates || {
      singleEvent: 45000,
      threeEventBundle: 120000,
      drone: 25000,
      album: 20000,
      cinema: 35000,
      lookbook: 65000,
      campaign: 110000,
      ecommerce: 45000
    };

    if (shootType === 'wedding') {
      const mehndi = document.getElementById('opt-mehndi')?.checked;
      const barat = document.getElementById('opt-barat')?.checked;
      const walima = document.getElementById('opt-walima')?.checked;

      let eventCount = (mehndi ? 1 : 0) + (barat ? 1 : 0) + (walima ? 1 : 0);
      if (eventCount === 3) {
        total += rates.threeEventBundle;
      } else {
        total += eventCount * rates.singleEvent;
      }
    } else {
      const fashionType = document.getElementById('opt-fashion-tier')?.value || 'lookbook';
      if (fashionType === 'lookbook') total += rates.lookbook;
      if (fashionType === 'campaign') total += rates.campaign;
      if (fashionType === 'ecommerce') total += rates.ecommerce;
    }

    if (document.getElementById('addon-drone')?.checked) total += rates.drone;
    if (document.getElementById('addon-album')?.checked) total += rates.album;
    if (document.getElementById('addon-cinema')?.checked) total += rates.cinema;

    totalDisplay.textContent = `PKR ${total.toLocaleString()}`;

    if (bookBtn) {
      const phone = (STUDIO_CONFIG.whatsappNumber || "923000000000").replace(/[^0-9]/g, '');
      const dateVal = document.getElementById('calc-date')?.value || 'Upcoming Date';
      const cityVal = document.getElementById('calc-city')?.value || 'Lahore';
      const text = `Hi ${STUDIO_CONFIG.studioName}! I would like to enquire about booking a shoot in ${cityVal} around ${dateVal}. Estimated package calculated on website: PKR ${total.toLocaleString()}. Please let me know your availability!`;
      bookBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    }
  }

  calcForm.addEventListener('change', calculateTotal);
  calculateTotal();

  const shootTypeRadios = document.querySelectorAll('input[name="shoot-type"]');
  shootTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const weddingOpts = document.getElementById('calc-wedding-options');
      const fashionOpts = document.getElementById('calc-fashion-options');
      if (radio.value === 'wedding') {
        weddingOpts?.classList.remove('hidden');
        fashionOpts?.classList.add('hidden');
      } else {
        weddingOpts?.classList.add('hidden');
        fashionOpts?.classList.remove('hidden');
      }
      calculateTotal();
    });
  });
}

// Contact Form
function initContactForm() {
  const form = document.getElementById('quick-enquiry-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('enq-name').value.trim();
    const phone = document.getElementById('enq-phone').value.trim();
    const type = document.getElementById('enq-type').value;
    const msg = document.getElementById('enq-message').value.trim();

    const cleanPhone = (STUDIO_CONFIG.whatsappNumber || "923000000000").replace(/[^0-9]/g, '');
    const waMsg = `Hello ${STUDIO_CONFIG.studioName}!\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Requirement:* ${type}\n*Message:* ${msg}\n\nLooking forward to hearing from you!`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;
    window.open(waUrl, '_blank');
  });
}

// Direct Booking Inquiry Form with Honeypot Spam Protection & Analytics Redirect
let lastDirectSubmitTime = 0;
function initDirectBookingForm() {
  const form = document.getElementById('direct-booking-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // 1. Honeypot Bot Trap Check
    const botTrap = document.getElementById('form-bot-trap')?.value;
    if (botTrap) {
      console.warn("Spam bot prevented by honeypot filter.");
      return;
    }

    // 2. Rate Limiting (Prevent rapid automated submissions)
    const now = Date.now();
    if (now - lastDirectSubmitTime < 3500) {
      showToast("⚠️ Baraye meherbani thora intezar karein.");
      return;
    }
    lastDirectSubmitTime = now;

    const name = document.getElementById('inq-name')?.value.trim() || 'Client';
    const phone = document.getElementById('inq-phone')?.value.trim() || '';
    const type = document.getElementById('inq-type')?.value || 'Wedding Coverage';
    const city = document.getElementById('inq-city')?.value.trim() || 'Lahore';
    const notes = document.getElementById('inq-notes')?.value.trim() || '';

    const cleanPhone = (STUDIO_CONFIG.whatsappNumber || "923000000000").replace(/[^0-9]/g, '');
    const waMsg = `Hello ${STUDIO_CONFIG.studioName}!\n\n*Name:* ${name}\n*Phone:* ${phone}\n*Shoot Type:* ${type}\n*Date & City:* ${city}\n*Notes:* ${notes}\n\nI just filled the inquiry form on your website. Looking forward to hearing from you!`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

    // Open WhatsApp
    window.open(waUrl, '_blank');

    // Trigger Google Analytics lead event if gtag exists
    if (typeof gtag === 'function') {
      gtag('event', 'generate_lead', {
        'event_category': 'Engagement',
        'event_label': type
      });
    }

    // Redirect to Thank-You Page for official confirmation
    setTimeout(() => {
      window.location.href = 'thank-you.html';
    }, 700);
  });
}

// Frequently Asked Questions (FAQ) Accordion Toggle
function initFaqAccordion() {
  const triggers = document.querySelectorAll('.faq-trigger');
  triggers.forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item?.querySelector('.faq-answer');
      if (!item || !answer) return;

      const isOpen = !answer.classList.contains('hidden');

      // Close other accordions
      document.querySelectorAll('.faq-item').forEach(other => {
        other.classList.remove('active');
        other.querySelector('.faq-answer')?.classList.add('hidden');
      });

      // Toggle current accordion
      if (!isOpen) {
        item.classList.add('active');
        answer.classList.remove('hidden');
      }
    });
  });
}

// Cookie & Privacy Consent Banner
function initCookieConsent() {
  const banner = document.getElementById('cookie-consent-banner');
  const acceptBtn = document.getElementById('accept-cookies-btn');
  const declineBtn = document.getElementById('decline-cookies-btn');
  if (!banner) return;

  const userConsent = localStorage.getItem('viewfind_cookies_consent');
  if (!userConsent) {
    setTimeout(() => {
      banner.classList.remove('hidden');
    }, 1500);
  }

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('viewfind_cookies_consent', 'accepted');
      banner.classList.add('hidden');
      showToast("✓ Privacy & Cookie preferences saved.");
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', () => {
      localStorage.setItem('viewfind_cookies_consent', 'declined');
      banner.classList.add('hidden');
    });
  }
}

// Open Image Changer Modal
function openImageChangerModal(imgElement) {
  activeImageTarget = imgElement;
  currentPendingImageSrc = imgElement.src;

  const modal = document.getElementById('image-edit-modal');
  const preview = document.getElementById('image-modal-preview');
  const urlInput = document.getElementById('image-url-input');

  if (!modal) return;

  if (preview) preview.src = imgElement.src;
  if (urlInput) urlInput.value = '';

  modal.classList.add('active');
}

function closeImageChangerModal() {
  const modal = document.getElementById('image-edit-modal');
  if (modal) modal.classList.remove('active');
  activeImageTarget = null;
  currentPendingImageSrc = '';
}

// =========================================================================
// FULL LIVE VISUAL IN-PLACE WYSIWYG EDITOR SYSTEM
// =========================================================================
function initFullLiveVisualEditor() {
  const toggleBtn = document.getElementById('toggle-live-editor-btn');
  const navBtn = document.getElementById('open-live-nav-btn');
  const saveBtn = document.getElementById('live-save-btn');
  const exportBtn = document.getElementById('live-export-btn');
  const resetBtn = document.getElementById('live-reset-btn');
  const exitBtn = document.getElementById('live-exit-btn');
  const settingsBtn = document.getElementById('live-open-settings-btn');

  const filePicker = document.getElementById('live-image-file-picker');
  const imageModal = document.getElementById('image-edit-modal');
  const chooseFileBtn = document.getElementById('choose-file-btn');
  const applyImageBtn = document.getElementById('apply-image-btn');
  const cancelImageBtn = document.getElementById('cancel-image-btn');
  const closeImageModalBtn = document.getElementById('close-image-modal');
  const imageUrlInput = document.getElementById('image-url-input');
  const previewImg = document.getElementById('image-modal-preview');

  // Query all tagged text elements
  function getEditableElements() {
    return document.querySelectorAll('[data-edit-key]');
  }

  // Toggle Live Edit Mode
  function enableLiveEditing() {
    isLiveEditing = true;
    document.body.classList.add('live-editor-active');

    getEditableElements().forEach(el => {
      // Ensure controls or buttons inside topbar/modals are excluded
      if (!el.closest('.live-editor-topbar') && !el.closest('#image-edit-modal') && !el.closest('#admin-modal-overlay')) {
        el.setAttribute('contenteditable', 'true');
        el.setAttribute('spellcheck', 'false');
      }
    });

    showToast("✏️ Live Editor On! Kisi bhi text ya picture par click karke direct edit karein.");
  }

  function disableLiveEditing() {
    isLiveEditing = false;
    document.body.classList.remove('live-editor-active');

    getEditableElements().forEach(el => {
      el.removeAttribute('contenteditable');
      el.removeAttribute('spellcheck');
    });

    closeImageChangerModal();
    showToast("Live Editor band ho gaya hai.");
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (isLiveEditing) disableLiveEditing();
      else enableLiveEditing();
    });
  }

  if (navBtn) {
    navBtn.addEventListener('click', () => {
      if (!isLiveEditing) enableLiveEditing();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (exitBtn) exitBtn.addEventListener('click', disableLiveEditing);

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      const adminModal = document.getElementById('admin-modal-overlay');
      if (adminModal) adminModal.classList.add('active');
    });
  }

  // Intercept clicks in edit mode:
  // 1. Prevent link navigation when clicking text to edit it
  // 2. Open image changer dialog when clicking any image on the page
  document.addEventListener('click', (e) => {
    if (!isLiveEditing) return;

    // Ignore controls in topbar or modals
    if (e.target.closest('.live-editor-topbar') || e.target.closest('#image-edit-modal') || e.target.closest('#admin-modal-overlay')) {
      return;
    }

    // Check if an image was clicked
    const clickedImg = e.target.closest('img');
    if (clickedImg) {
      e.preventDefault();
      e.stopPropagation();
      openImageChangerModal(clickedImg);
      return;
    }

    // Check if an anchor tag was clicked while editing
    const clickedLink = e.target.closest('a');
    if (clickedLink && !clickedLink.classList.contains('whatsapp-float-btn')) {
      e.preventDefault();
    }
  }, true);

  // Setup Image Edit Dialog Listeners
  if (chooseFileBtn && filePicker) {
    chooseFileBtn.addEventListener('click', () => {
      filePicker.value = '';
      filePicker.click();
    });
  }

  if (filePicker) {
    filePicker.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          currentPendingImageSrc = event.target.result;
          if (previewImg) previewImg.src = currentPendingImageSrc;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        currentPendingImageSrc = val;
        if (previewImg) previewImg.src = val;
      }
    });
  }

  if (applyImageBtn) {
    applyImageBtn.addEventListener('click', () => {
      if (activeImageTarget && currentPendingImageSrc) {
        activeImageTarget.src = currentPendingImageSrc;
        closeImageChangerModal();
        showToast("📷 Photo tabdeel ho gayi! Upar 'Save Changes' dabana mat bhooliye ga.");
      } else {
        closeImageChangerModal();
      }
    });
  }

  if (cancelImageBtn) cancelImageBtn.addEventListener('click', closeImageChangerModal);
  if (closeImageModalBtn) closeImageModalBtn.addEventListener('click', closeImageChangerModal);

  if (imageModal) {
    imageModal.addEventListener('click', (e) => {
      if (e.target === imageModal) closeImageChangerModal();
    });
  }

  // Save All Changes (Collect All Edits and Store in LocalStorage)
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const payload = {
        config: STUDIO_CONFIG,
        texts: {},
        images: {}
      };

      // Collect all edited texts
      document.querySelectorAll('[data-edit-key]').forEach(el => {
        const key = el.getAttribute('data-edit-key');
        payload.texts[key] = el.innerHTML;
      });

      // Collect all images
      document.querySelectorAll('[data-img-key]').forEach(img => {
        const key = img.getAttribute('data-img-key');
        payload.images[key] = img.src;
      });

      try {
        localStorage.setItem('viewfind_live_page_content', JSON.stringify(payload));
        showToast("💾 Zabardast! Aapki poori website ka content save ho chuka hai!");
      } catch (err) {
        console.warn("Storage quota limit reached (usually caused by many high-res base64 images):", err);
        showToast("⚠️ Text save ho gaya hai! Tasveeron ko permanently save karne ke liye 'Download index.html' dabayein.");
      }
    });
  }

  // Export / Download Current Edited HTML file
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Clone document and clean up edit attributes
      const cloneDoc = document.documentElement.cloneNode(true);
      cloneDoc.querySelector('body')?.classList.remove('live-editor-active');
      cloneDoc.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
      cloneDoc.querySelectorAll('#image-edit-modal, #admin-modal-overlay').forEach(m => m.classList.remove('active'));

      const htmlContent = "<!DOCTYPE html>\n" + cloneDoc.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = 'index.html';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast("📥 Updated index.html file download ho chuki hai! Desktop par replace kar lein.");
    });
  }

  // Reset to Original Website
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm("Kya aap waqai tamam changes mita kar original website restore karna chahte hain?")) {
        localStorage.removeItem('viewfind_live_page_content');
        window.location.reload();
      }
    });
  }
}

// =========================================================================
// STUDIO INFO & RATES SETTINGS MODAL SYSTEM
// =========================================================================
function initAdminModal() {
  const overlay = document.getElementById('admin-modal-overlay');
  const closeBtn = document.getElementById('close-admin-btn');
  const openBtn = document.getElementById('open-admin-btn');
  const saveBtn = document.getElementById('adm-save-all-btn');
  const resetBtn = document.getElementById('adm-reset-btn');
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');

  if (!overlay) return;

  function openModal() {
    populateModalFields();
    overlay.classList.add('active');
  }

  function closeModal() {
    overlay.classList.remove('active');
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.add('hidden'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.remove('hidden');
    });
  });

  // Populate modal fields with existing state
  function populateModalFields() {
    const sName = document.getElementById('adm-studio-name');
    const sLoc = document.getElementById('adm-location');
    const sWa = document.getElementById('adm-whatsapp');
    const sPhone = document.getElementById('adm-phone-display');
    const sTag = document.getElementById('adm-tagline');

    if (sName) sName.value = STUDIO_CONFIG.studioName || "View Find Studio";
    if (sLoc) sLoc.value = STUDIO_CONFIG.location || "Lahore, Pakistan";
    if (sWa) sWa.value = STUDIO_CONFIG.whatsappNumber || "923000000000";
    if (sPhone) sPhone.value = STUDIO_CONFIG.phoneDisplay || "+92 300 0000000";
    if (sTag) sTag.value = STUDIO_CONFIG.tagline || "Pictures that outlive the moment.";

    // Rates
    const rates = STUDIO_CONFIG.rates || {};
    const rSingle = document.getElementById('adm-rate-single');
    const rBundle = document.getElementById('adm-rate-bundle');
    const rDrone = document.getElementById('adm-rate-drone');
    const rAlbum = document.getElementById('adm-rate-album');
    const rCinema = document.getElementById('adm-rate-cinema');
    const rLookbook = document.getElementById('adm-rate-lookbook');
    const rCampaign = document.getElementById('adm-rate-campaign');

    if (rSingle) rSingle.value = rates.singleEvent || 45000;
    if (rBundle) rBundle.value = rates.threeEventBundle || 120000;
    if (rDrone) rDrone.value = rates.drone || 25000;
    if (rAlbum) rAlbum.value = rates.album || 20000;
    if (rCinema) rCinema.value = rates.cinema || 35000;
    if (rLookbook) rLookbook.value = rates.lookbook || 65000;
    if (rCampaign) rCampaign.value = rates.campaign || 110000;
  }

  // Save Modal Settings
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const sName = document.getElementById('adm-studio-name')?.value.trim();
      const sLoc = document.getElementById('adm-location')?.value.trim();
      const sWa = document.getElementById('adm-whatsapp')?.value.trim();
      const sPhone = document.getElementById('adm-phone-display')?.value.trim();
      const sTag = document.getElementById('adm-tagline')?.value.trim();

      if (sName) STUDIO_CONFIG.studioName = sName;
      if (sLoc) STUDIO_CONFIG.location = sLoc;
      if (sWa) STUDIO_CONFIG.whatsappNumber = sWa;
      if (sPhone) STUDIO_CONFIG.phoneDisplay = sPhone;
      if (sTag) STUDIO_CONFIG.tagline = sTag;

      // Rates
      STUDIO_CONFIG.rates = {
        singleEvent: Number(document.getElementById('adm-rate-single')?.value) || 45000,
        threeEventBundle: Number(document.getElementById('adm-rate-bundle')?.value) || 120000,
        drone: Number(document.getElementById('adm-rate-drone')?.value) || 25000,
        album: Number(document.getElementById('adm-rate-album')?.value) || 20000,
        cinema: Number(document.getElementById('adm-rate-cinema')?.value) || 35000,
        lookbook: Number(document.getElementById('adm-rate-lookbook')?.value) || 65000,
        campaign: Number(document.getElementById('adm-rate-campaign')?.value) || 110000,
        ecommerce: 45000
      };

      applyStudioConfigToUI();
      initPriceCalculator();

      // Trigger automatic save to localStorage
      const liveSaveBtn = document.getElementById('live-save-btn');
      if (liveSaveBtn) liveSaveBtn.click();

      closeModal();
      showToast("✨ Studio Settings kamyabi se apply aur save ho chuki hain!");
    });
  }

  // Reset Button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm("Kya aap settings ko default par reset karna chahte hain?")) {
        localStorage.removeItem('viewfind_live_page_content');
        window.location.reload();
      }
    });
  }
}

// Global Toast Messenger
function showToast(msg) {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  const label = toast.querySelector('span');
  if (label) label.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4800);
}
