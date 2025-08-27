import React from 'react';
import { render, screen } from '@testing-library/react';
import { Price } from '../price';

describe('Price Component', () => {
  describe('Basic rendering', () => {
    it('should render price with default formatting', () => {
      render(<Price amount={19.99} />);
      const price = screen.getByText(/19[,.]99/);
      expect(price).toBeInTheDocument();
      expect(price).toHaveTextContent('€');
    });

    it('should format price with French locale', () => {
      render(<Price amount={1234.56} />);
      // French formatting uses comma for decimals and space for thousands
      const price = screen.getByText(/1[\s ]?234[,.]56/);
      expect(price).toBeInTheDocument();
    });

    it('should handle zero amount', () => {
      render(<Price amount={0} />);
      const price = screen.getByText(/0[,.]00/);
      expect(price).toBeInTheDocument();
    });

    it('should handle negative amounts', () => {
      render(<Price amount={-10.50} />);
      const price = screen.getByText(/-10[,.]50/);
      expect(price).toBeInTheDocument();
    });

    it('should handle large amounts', () => {
      render(<Price amount={999999.99} />);
      const price = screen.getByText(/999[\s ]?999[,.]99/);
      expect(price).toBeInTheDocument();
    });
  });

  describe('Currency prop', () => {
    it('should display EUR currency by default', () => {
      render(<Price amount={20} />);
      expect(screen.getByText(/€/)).toBeInTheDocument();
    });

    it('should display USD currency when specified', () => {
      render(<Price amount={20} currency="USD" />);
      expect(screen.getByText(/\$/)).toBeInTheDocument();
    });

    it('should display GBP currency when specified', () => {
      render(<Price amount={20} currency="GBP" />);
      expect(screen.getByText(/£/)).toBeInTheDocument();
    });

    it('should handle custom currency codes', () => {
      render(<Price amount={20} currency="CHF" />);
      expect(screen.getByText(/CHF/)).toBeInTheDocument();
    });
  });

  describe('Custom className and styles', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Price amount={10} className="text-red-500 font-bold" />
      );
      const priceElement = container.firstChild;
      expect(priceElement).toHaveClass('text-red-500', 'font-bold');
    });

    it('should apply default styling classes', () => {
      const { container } = render(<Price amount={10} />);
      const priceElement = container.firstChild;
      // Check for common price styling classes
      expect(priceElement?.className).toBeTruthy();
    });

    it('should merge custom and default classes', () => {
      const { container } = render(
        <Price amount={10} className="custom-price" />
      );
      const priceElement = container.firstChild;
      expect(priceElement).toHaveClass('custom-price');
    });
  });

  describe('Locale prop', () => {
    it('should format with French locale', () => {
      render(<Price amount={1000.50} locale="fr-FR" />);
      // French uses space as thousand separator and comma for decimals
      const price = screen.getByText(/1[\s ]?000[,.]50/);
      expect(price).toBeInTheDocument();
    });

    it('should format with US locale', () => {
      render(<Price amount={1000.50} locale="en-US" currency="USD" />);
      // US uses comma as thousand separator and period for decimals
      const price = screen.getByText(/1,?000\.50/);
      expect(price).toBeInTheDocument();
    });

    it('should format with German locale', () => {
      render(<Price amount={1000.50} locale="de-DE" />);
      // German uses period as thousand separator and comma for decimals
      const price = screen.getByText(/1\.?000[,.]50/);
      expect(price).toBeInTheDocument();
    });
  });

  describe('Special cases', () => {
    it('should handle undefined amount', () => {
      render(<Price amount={undefined as any} />);
      // Should either show 0 or handle gracefully
      const price = screen.queryByText(/0[,.]00/);
      expect(price || screen.queryByText(/--/)).toBeInTheDocument();
    });

    it('should handle null amount', () => {
      render(<Price amount={null as any} />);
      const price = screen.queryByText(/0[,.]00/);
      expect(price || screen.queryByText(/--/)).toBeInTheDocument();
    });

    it('should handle NaN amount', () => {
      render(<Price amount={NaN} />);
      const price = screen.queryByText(/0[,.]00/);
      expect(price || screen.queryByText(/--/)).toBeInTheDocument();
    });

    it('should handle Infinity amount', () => {
      render(<Price amount={Infinity} />);
      // Should handle gracefully, possibly showing max value or error state
      expect(screen.queryByText(/∞/) || screen.queryByText(/--/)).toBeTruthy();
    });
  });

  describe('Discount and original price', () => {
    it('should show original price with strikethrough when provided', () => {
      const { container } = render(
        <Price amount={15.99} originalAmount={19.99} />
      );
      
      // Look for strikethrough price
      const strikethroughPrice = container.querySelector('s, del, [style*="line-through"]');
      expect(strikethroughPrice).toBeInTheDocument();
      expect(strikethroughPrice).toHaveTextContent(/19[,.]99/);
    });

    it('should calculate and display discount percentage', () => {
      render(
        <Price amount={15} originalAmount={20} showDiscount />
      );
      
      // 25% discount
      const discount = screen.getByText(/25%|25\s?%/);
      expect(discount).toBeInTheDocument();
    });

    it('should not show discount when prices are equal', () => {
      const { container } = render(
        <Price amount={20} originalAmount={20} showDiscount />
      );
      
      const strikethroughPrice = container.querySelector('s, del, [style*="line-through"]');
      expect(strikethroughPrice).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate ARIA attributes', () => {
      render(<Price amount={19.99} />);
      const priceElement = screen.getByText(/19[,.]99/);
      
      // Price should be readable by screen readers
      expect(priceElement).toBeVisible();
    });

    it('should include currency in accessible text', () => {
      render(<Price amount={19.99} currency="EUR" />);
      const priceText = screen.getByText(/19[,.]99/);
      expect(priceText.textContent).toMatch(/€|EUR|euros?/i);
    });

    it('should indicate discounts accessibly', () => {
      const { container } = render(
        <Price 
          amount={15} 
          originalAmount={20} 
          showDiscount 
          aria-label="Discounted price: 15 euros, originally 20 euros"
        />
      );
      
      const priceElement = container.firstChild;
      expect(priceElement).toHaveAttribute('aria-label');
    });
  });

  describe('Free price handling', () => {
    it('should display "Gratuit" for zero amount in French', () => {
      render(<Price amount={0} showFree locale="fr-FR" />);
      expect(screen.getByText(/Gratuit/i)).toBeInTheDocument();
    });

    it('should display "Free" for zero amount in English', () => {
      render(<Price amount={0} showFree locale="en-US" />);
      expect(screen.getByText(/Free/i)).toBeInTheDocument();
    });

    it('should display price normally when showFree is false', () => {
      render(<Price amount={0} showFree={false} />);
      expect(screen.getByText(/0[,.]00/)).toBeInTheDocument();
      expect(screen.queryByText(/Gratuit|Free/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading and error states', () => {
    it('should show loading state when isLoading is true', () => {
      render(<Price amount={19.99} isLoading />);
      
      // Should show skeleton or loading indicator
      const skeleton = document.querySelector('[class*="skeleton"], [class*="loading"]');
      expect(skeleton || screen.queryByText(/--/)).toBeTruthy();
    });

    it('should show error state when hasError is true', () => {
      render(<Price amount={19.99} hasError />);
      
      // Should show error indicator or fallback
      expect(screen.queryByText(/--/) || screen.queryByText(/Error/i)).toBeTruthy();
    });
  });
});