// Tooltip functionality
document.addEventListener('DOMContentLoaded', function() {
  const triggers = document.querySelectorAll('.tooltip-trigger');
  let activeTooltip = null;

  triggers.forEach(trigger => {
    const tooltipText = trigger.getAttribute('data-tooltip');
    const tooltipLink = trigger.getAttribute('data-link');

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'tooltip-text';
    textDiv.textContent = tooltipText;
    tooltip.appendChild(textDiv);

    if (tooltipLink) {
      const linkDiv = document.createElement('a');
      linkDiv.className = 'tooltip-link';
      linkDiv.href = tooltipLink;
      linkDiv.target = '_blank';
      linkDiv.rel = 'noopener noreferrer';
      linkDiv.textContent = 'Read more in essay →';
      tooltip.appendChild(linkDiv);
    }

    // Append tooltip to body for better positioning
    document.body.appendChild(tooltip);

    // Show tooltip on hover
    trigger.addEventListener('mouseenter', function() {
      // Clear any pending hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // Hide any existing tooltip
      if (activeTooltip) {
        activeTooltip.classList.remove('active');
      }

      // Position tooltip relative to viewport (fixed positioning)
      const rect = trigger.getBoundingClientRect();
      
      // Show tooltip temporarily to measure it
      tooltip.style.visibility = 'hidden';
      tooltip.style.display = 'block';
      tooltip.classList.add('active');
      const tooltipRect = tooltip.getBoundingClientRect();
      tooltip.classList.remove('active');
      tooltip.style.visibility = 'visible';
      tooltip.style.display = '';
      
      // Calculate position (centered above trigger)
      let left = rect.left + (rect.width / 2);
      let top = rect.top - tooltipRect.height - 8;
      let transformX = -50;
      let transformY = 0;

      // Adjust if tooltip goes off screen horizontally
      if (left - (tooltipRect.width / 2) < 10) {
        left = rect.left + 10;
        transformX = 0;
      } else if (left + (tooltipRect.width / 2) > window.innerWidth - 10) {
        left = rect.right - 10;
        transformX = -100;
      }

      // Adjust if tooltip goes off screen vertically (show below instead)
      if (top < 10) {
        top = rect.bottom + 8;
        tooltip.classList.add('tooltip-below');
      } else {
        tooltip.classList.remove('tooltip-below');
      }

      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
      tooltip.style.transform = `translate(${transformX}%, ${transformY}%)`;
      
      // Show tooltip
      tooltip.classList.add('active');
      activeTooltip = tooltip;
    });

    // Hide tooltip on mouse leave with delay to allow moving to tooltip
    let hideTimeout = null;
    
    trigger.addEventListener('mouseleave', function() {
      // Add small delay before hiding to allow moving cursor to tooltip
      hideTimeout = setTimeout(function() {
        // Check if mouse is not over tooltip
        if (!tooltip.matches(':hover')) {
          tooltip.classList.remove('active');
          if (activeTooltip === tooltip) {
            activeTooltip = null;
          }
        }
      }, 100);
    });

    // Keep tooltip open when hovering over it
    tooltip.addEventListener('mouseenter', function() {
      // Clear any pending hide timeout
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      tooltip.classList.add('active');
      activeTooltip = tooltip;
    });

    tooltip.addEventListener('mouseleave', function() {
      tooltip.classList.remove('active');
      if (activeTooltip === tooltip) {
        activeTooltip = null;
      }
    });
  });

  // Lightbox functionality
  const lightboxImage = document.querySelector('.figure img');
  if (lightboxImage) {
    // Create lightbox elements
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <button class="lightbox-close" aria-label="Close lightbox">&times;</button>
      <img src="${lightboxImage.src}" alt="${lightboxImage.alt}" />
    `;
    document.body.appendChild(lightbox);

    // Make the original image clickable
    lightboxImage.style.cursor = 'zoom-in';
    
    // Open lightbox on image click
    lightboxImage.addEventListener('click', function() {
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    // Close lightbox functions
    function closeLightbox() {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    }

    // Close on overlay click
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
        closeLightbox();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  // FAQ Accordion functionality
  const faqQuestions = document.querySelectorAll('.faq-question');
  
  faqQuestions.forEach(question => {
    question.addEventListener('click', function() {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      const answer = this.nextElementSibling;
      
      // Close all other FAQ items
      faqQuestions.forEach(q => {
        if (q !== question) {
          q.setAttribute('aria-expanded', 'false');
          q.nextElementSibling.classList.remove('active');
        }
      });
      
      // Toggle current FAQ item
      if (isExpanded) {
        this.setAttribute('aria-expanded', 'false');
        answer.classList.remove('active');
      } else {
        this.setAttribute('aria-expanded', 'true');
        answer.classList.add('active');
      }
    });
  });
});
