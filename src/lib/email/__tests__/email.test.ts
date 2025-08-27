import { sendEmail, sendOrderConfirmation, sendPasswordReset, sendWelcomeEmail } from '../email';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('Email Service', () => {
  let mockTransporter: any;
  let mockSendMail: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock transporter
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
    mockTransporter = {
      sendMail: mockSendMail,
      verify: jest.fn().mockResolvedValue(true),
    };
    
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
    
    // Setup environment variables
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'testpass';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send basic email successfully', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content'
      };

      const result = await sendEmail(emailData);

      expect(result).toEqual({ 
        success: true, 
        messageId: 'test-message-id' 
      });
      
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.stringContaining('test@test.com'),
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        text: 'Test Content'
      });
    });

    it('should handle multiple recipients', async () => {
      const emailData = {
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Multi Recipient Email',
        html: '<p>Content for multiple users</p>'
      };

      await sendEmail(emailData);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user1@example.com', 'user2@example.com']
        })
      );
    });

    it('should handle CC and BCC recipients', async () => {
      const emailData = {
        to: 'main@example.com',
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
        subject: 'Email with CC and BCC',
        html: '<p>Content</p>'
      };

      await sendEmail(emailData);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'main@example.com',
          cc: 'cc@example.com',
          bcc: ['bcc1@example.com', 'bcc2@example.com']
        })
      );
    });

    it('should handle email sending failure', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      const result = await sendEmail(emailData);

      expect(result).toEqual({
        success: false,
        error: 'SMTP connection failed'
      });
    });

    it('should validate email addresses', async () => {
      const emailData = {
        to: 'invalid-email',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      const result = await sendEmail(emailData);

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('Invalid email')
      });
    });

    it('should handle attachments', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Email with Attachment',
        html: '<p>See attached file</p>',
        attachments: [
          {
            filename: 'invoice.pdf',
            content: Buffer.from('PDF content'),
            contentType: 'application/pdf'
          }
        ]
      };

      await sendEmail(emailData);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({
              filename: 'invoice.pdf'
            })
          ])
        })
      );
    });

    it('should use reply-to address when provided', async () => {
      const emailData = {
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        replyTo: 'noreply@example.com'
      };

      await sendEmail(emailData);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'noreply@example.com'
        })
      );
    });
  });

  describe('sendOrderConfirmation', () => {
    const mockOrder = {
      id: 'order-123',
      customer_email: 'customer@example.com',
      total: 99.99,
      items: [
        {
          name: 'Product 1',
          quantity: 2,
          price: 25.00
        },
        {
          name: 'Product 2',
          quantity: 1,
          price: 49.99
        }
      ],
      shipping_address: {
        name: 'John Doe',
        line1: '123 Main St',
        city: 'Paris',
        postal_code: '75001',
        country: 'FR'
      }
    };

    it('should send order confirmation email', async () => {
      const result = await sendOrderConfirmation(mockOrder);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: expect.stringContaining('order-123'),
          html: expect.stringContaining('99.99')
        })
      );
    });

    it('should include order items in email', async () => {
      await sendOrderConfirmation(mockOrder);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('Product 1');
      expect(emailCall.html).toContain('Product 2');
      expect(emailCall.html).toContain('25.00');
      expect(emailCall.html).toContain('49.99');
    });

    it('should include shipping address', async () => {
      await sendOrderConfirmation(mockOrder);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('John Doe');
      expect(emailCall.html).toContain('123 Main St');
      expect(emailCall.html).toContain('Paris');
      expect(emailCall.html).toContain('75001');
    });

    it('should handle missing optional fields', async () => {
      const minimalOrder = {
        id: 'order-456',
        customer_email: 'customer@example.com',
        total: 50.00,
        items: []
      };

      const result = await sendOrderConfirmation(minimalOrder);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should use template with proper formatting', async () => {
      await sendOrderConfirmation(mockOrder);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('<!DOCTYPE html>');
      expect(emailCall.html).toContain('In Herbis Veritas');
      expect(emailCall.text).toBeTruthy(); // Should have text version
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email', async () => {
      const resetData = {
        email: 'user@example.com',
        resetToken: 'reset-token-123',
        userName: 'John'
      };

      const result = await sendPasswordReset(resetData);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('mot de passe'),
          html: expect.stringContaining('reset-token-123')
        })
      );
    });

    it('should include reset link in email', async () => {
      const resetData = {
        email: 'user@example.com',
        resetToken: 'token-abc',
        userName: 'Jane'
      };

      await sendPasswordReset(resetData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain(`/auth/reset-password?token=token-abc`);
      expect(emailCall.html).toContain('Jane');
    });

    it('should include expiration warning', async () => {
      const resetData = {
        email: 'user@example.com',
        resetToken: 'token-123',
        expiresIn: '1 heure'
      };

      await sendPasswordReset(resetData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('1 heure');
      expect(emailCall.html).toContain('expire');
    });

    it('should handle missing userName', async () => {
      const resetData = {
        email: 'user@example.com',
        resetToken: 'token-123'
      };

      const result = await sendPasswordReset(resetData);

      expect(result.success).toBe(true);
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('Bonjour');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email to new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        verificationToken: 'verify-123'
      };

      const result = await sendWelcomeEmail(userData);

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@example.com',
          subject: expect.stringContaining('Bienvenue'),
          html: expect.stringContaining('New User')
        })
      );
    });

    it('should include verification link if token provided', async () => {
      const userData = {
        email: 'user@example.com',
        name: 'User',
        verificationToken: 'verify-abc'
      };

      await sendWelcomeEmail(userData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('/auth/verify?token=verify-abc');
      expect(emailCall.html).toContain('vérifier');
    });

    it('should work without verification token', async () => {
      const userData = {
        email: 'user@example.com',
        name: 'User'
      };

      const result = await sendWelcomeEmail(userData);

      expect(result.success).toBe(true);
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).not.toContain('/auth/verify');
    });

    it('should include onboarding information', async () => {
      const userData = {
        email: 'user@example.com',
        name: 'User'
      };

      await sendWelcomeEmail(userData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('In Herbis Veritas');
      // Should contain useful links or next steps
      expect(emailCall.html).toMatch(/boutique|produit|découvr/i);
    });
  });

  describe('Email templates', () => {
    it('should use consistent branding across emails', async () => {
      // Send different types of emails
      await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      await sendOrderConfirmation({
        id: '123',
        customer_email: 'test@example.com',
        total: 50,
        items: []
      });

      await sendPasswordReset({
        email: 'test@example.com',
        resetToken: 'token'
      });

      // Check all emails have consistent branding
      const calls = mockSendMail.mock.calls;
      calls.forEach(call => {
        if (call[0].html && call[0].html.includes('<!DOCTYPE')) {
          expect(call[0].html).toContain('In Herbis Veritas');
        }
      });
    });

    it('should include unsubscribe link in marketing emails', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Newsletter',
        html: '<p>Newsletter content</p>',
        isMarketing: true
      };

      await sendEmail(emailData);

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('unsubscribe');
      expect(emailCall.html).toContain('/unsubscribe');
    });
  });

  describe('Error handling', () => {
    it('should handle missing SMTP configuration', async () => {
      delete process.env.SMTP_HOST;
      
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP');
    });

    it('should handle transporter verification failure', async () => {
      mockTransporter.verify.mockRejectedValueOnce(new Error('Invalid credentials'));

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials');
    });

    it('should retry on temporary failures', async () => {
      mockSendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ messageId: 'success-id' });

      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });

    it('should not retry on permanent failures', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Invalid recipient address'));

      const result = await sendEmail({
        to: 'invalid@',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });
});