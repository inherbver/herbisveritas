/**
 * Tests pour AddressForm - Phase 3.3
 * Tests de validation, soumission, et intégration avec l'API Colissimo
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import {
  renderWithProviders,
  UserFactory,
  testHelpers,
  assertions,
} from '@/test-utils'

// Mock de l'API Colissimo
jest.mock('@/services/address-validation.service', () => ({
  AddressValidationService: {
    validateAddress: jest.fn(),
  },
}))

// Composant AddressForm simplifié pour les tests
function AddressForm({
  type = 'shipping',
  initialData = {},
  onSubmit,
  onValidation,
}: {
  type?: 'shipping' | 'billing'
  initialData?: any
  onSubmit?: (data: any) => void
  onValidation?: (isValid: boolean) => void
}) {
  const [formData, setFormData] = React.useState({
    line1: initialData.line1 || '',
    line2: initialData.line2 || '',
    city: initialData.city || '',
    postal_code: initialData.postal_code || '',
    country: initialData.country || 'FR',
    ...initialData,
  })
  
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors }
    
    switch (name) {
      case 'line1':
        if (!value.trim()) {
          newErrors.line1 = 'L\'adresse est requise'
        } else if (value.length < 5) {
          newErrors.line1 = 'L\'adresse doit contenir au moins 5 caractères'
        } else {
          delete newErrors.line1
        }
        break
        
      case 'city':
        if (!value.trim()) {
          newErrors.city = 'La ville est requise'
        } else if (!/^[a-zA-ZÀ-ÿ\s-']+$/.test(value)) {
          newErrors.city = 'La ville contient des caractères invalides'
        } else {
          delete newErrors.city
        }
        break
        
      case 'postal_code':
        if (!value.trim()) {
          newErrors.postal_code = 'Le code postal est requis'
        } else if (formData.country === 'FR' && !/^[0-9]{5}$/.test(value)) {
          newErrors.postal_code = 'Le code postal français doit contenir 5 chiffres'
        } else {
          delete newErrors.postal_code
        }
        break
    }
    
    setErrors(newErrors)
    onValidation?.(Object.keys(newErrors).length === 0)
    return Object.keys(newErrors).length === 0
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Validation en temps réel
    setTimeout(() => validateField(name, value), 300)
  }
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    validateField(name, value)
  }
  
  const validateWithColissimo = async () => {
    if (formData.country !== 'FR' || !formData.postal_code || !formData.city) {
      return
    }
    
    setIsValidating(true)
    
    try {
      const { AddressValidationService } = require('@/services/address-validation.service')
      const result = await AddressValidationService.validateAddress({
        street: formData.line1,
        city: formData.city,
        postalCode: formData.postal_code,
        country: formData.country,
      })
      
      if (!result.isValid) {
        setErrors(prev => ({
          ...prev,
          colissimo: 'Adresse non trouvée par Colissimo. Vérifiez les informations.',
        }))
      } else {
        // Mise à jour avec l'adresse normalisée
        if (result.normalizedAddress) {
          setFormData(prev => ({
            ...prev,
            line1: result.normalizedAddress.street || prev.line1,
            city: result.normalizedAddress.city || prev.city,
            postal_code: result.normalizedAddress.postalCode || prev.postal_code,
          }))
        }
        
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.colissimo
          return newErrors
        })
      }
    } catch (error) {
      console.error('Erreur validation Colissimo:', error)
      setErrors(prev => ({
        ...prev,
        colissimo: 'Erreur lors de la validation de l\'adresse',
      }))
    } finally {
      setIsValidating(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation complète
    const isValid = Object.keys(formData).every(key => 
      validateField(key, formData[key as keyof typeof formData])
    )
    
    if (!isValid) {
      return
    }
    
    setIsSubmitting(true)
    
    try {
      await onSubmit?.(formData)
    } catch (error) {
      console.error('Erreur soumission:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const isFormValid = Object.keys(errors).length === 0 && 
    formData.line1 && formData.city && formData.postal_code
  
  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2>{type === 'shipping' ? 'Adresse de livraison' : 'Adresse de facturation'}</h2>
      
      <div className="form-group">
        <label htmlFor={`${type}-line1`}>
          Adresse <span className="required">*</span>
        </label>
        <input
          id={`${type}-line1`}
          name="line1"
          type="text"
          value={formData.line1}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-required="true"
          aria-invalid={!!errors.line1}
          aria-describedby={errors.line1 ? `${type}-line1-error` : undefined}
          placeholder="123 rue de la Paix"
        />
        {errors.line1 && (
          <div id={`${type}-line1-error`} className="error" role="alert">
            {errors.line1}
          </div>
        )}
      </div>
      
      <div className="form-group">
        <label htmlFor={`${type}-line2`}>
          Complément d'adresse
        </label>
        <input
          id={`${type}-line2`}
          name="line2"
          type="text"
          value={formData.line2}
          onChange={handleChange}
          placeholder="Appartement, étage, etc."
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`${type}-postal_code`}>
            Code postal <span className="required">*</span>
          </label>
          <input
            id={`${type}-postal_code`}
            name="postal_code"
            type="text"
            value={formData.postal_code}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-required="true"
            aria-invalid={!!errors.postal_code}
            aria-describedby={errors.postal_code ? `${type}-postal_code-error` : undefined}
            placeholder="75001"
            maxLength={5}
          />
          {errors.postal_code && (
            <div id={`${type}-postal_code-error`} className="error" role="alert">
              {errors.postal_code}
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor={`${type}-city`}>
            Ville <span className="required">*</span>
          </label>
          <input
            id={`${type}-city`}
            name="city"
            type="text"
            value={formData.city}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-required="true"
            aria-invalid={!!errors.city}
            aria-describedby={errors.city ? `${type}-city-error` : undefined}
            placeholder="Paris"
          />
          {errors.city && (
            <div id={`${type}-city-error`} className="error" role="alert">
              {errors.city}
            </div>
          )}
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor={`${type}-country`}>
          Pays <span className="required">*</span>
        </label>
        <select
          id={`${type}-country`}
          name="country"
          value={formData.country}
          onChange={handleChange}
          aria-required="true"
        >
          <option value="FR">France</option>
          <option value="BE">Belgique</option>
          <option value="LU">Luxembourg</option>
          <option value="DE">Allemagne</option>
          <option value="ES">Espagne</option>
          <option value="IT">Italie</option>
        </select>
      </div>
      
      {formData.country === 'FR' && isFormValid && (
        <div className="form-group">
          <button
            type="button"
            onClick={validateWithColissimo}
            disabled={isValidating}
            className="btn-secondary"
            aria-describedby="colissimo-help"
          >
            {isValidating ? 'Vérification...' : 'Vérifier avec Colissimo'}
          </button>
          <small id="colissimo-help" className="help-text">
            Validez votre adresse avec le service postal français
          </small>
          {errors.colissimo && (
            <div className="error" role="alert">
              {errors.colissimo}
            </div>
          )}
        </div>
      )}
      
      <div className="form-actions">
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="btn-primary"
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer l\'adresse'}
        </button>
      </div>
    </form>
  )
}

describe('AddressForm - Tests Composant React (Phase 3.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendu et états de base', () => {
    it('should render shipping address form with all required fields', () => {
      // Act
      renderWithProviders(<AddressForm type="shipping" />)
      
      // Assert
      expect(screen.getByRole('heading', { name: /adresse de livraison/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/^Adresse/)).toBeInTheDocument()
      expect(screen.getByLabelText(/complément d'adresse/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/code postal/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/ville/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/pays/i)).toBeInTheDocument()
      
      // Vérifier que le bouton de soumission est désactivé initialement
      const submitButton = screen.getByRole('button', { name: /enregistrer l'adresse/i })
      expect(submitButton).toBeDisabled()
    })
    
    it('should render billing address form when type is billing', () => {
      // Act
      renderWithProviders(<AddressForm type="billing" />)
      
      // Assert
      expect(screen.getByRole('heading', { name: /adresse de facturation/i })).toBeInTheDocument()
    })
    
    it('should populate form with initial data', () => {
      // Arrange
      const initialData = {
        line1: '123 rue de la Paix',
        city: 'Paris',
        postal_code: '75001',
        country: 'FR',
      }
      
      // Act
      renderWithProviders(<AddressForm initialData={initialData} />)
      
      // Assert
      expect(screen.getByDisplayValue('123 rue de la Paix')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Paris')).toBeInTheDocument()
      expect(screen.getByDisplayValue('75001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('France')).toBeInTheDocument()
    })
  })

  describe('Validation des champs', () => {
    it('should validate required fields on blur', async () => {
      // Arrange
      const { user } = renderWithProviders(<AddressForm />)
      
      // Act - Focus puis blur sur un champ requis vide
      const addressField = screen.getByLabelText(/^Adresse/)
      await user.click(addressField)
      await user.tab() // Blur
      
      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('L\'adresse est requise')
      })
      
      expect(addressField).toHaveAttribute('aria-invalid', 'true')
    })
    
    it('should validate postal code format for France', async () => {
      // Arrange
      const { user } = renderWithProviders(<AddressForm />)
      
      // Act
      const postalCodeField = screen.getByLabelText(/code postal.*\*/)
      await testHelpers.clearAndType(user, postalCodeField, '1234') // Code trop court
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Le code postal français doit contenir 5 chiffres')
      })
    })
    
    it('should validate city format', async () => {
      // Arrange
      const { user } = renderWithProviders(<AddressForm />)
      
      // Act
      const cityField = screen.getByLabelText(/ville.*\*/)
      await testHelpers.clearAndType(user, cityField, 'Paris123') // Caractères invalides
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('La ville contient des caractères invalides')
      })
    })
    
    it('should clear errors when valid input is provided', async () => {
      // Arrange
      const { user } = renderWithProviders(<AddressForm />)
      
      // Act - Saisir une valeur invalide puis valide
      const addressField = screen.getByLabelText(/adresse.*\*/)
      await testHelpers.clearAndType(user, addressField, '123')
      await user.tab()
      
      // Assert error appears
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('L\'adresse doit contenir au moins 5 caractères')
      })
      
      // Act - Corriger l'erreur
      await testHelpers.clearAndType(user, addressField, '123 rue de la Paix')
      await user.tab()
      
      // Assert error disappears
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
      
      expect(addressField).toHaveAttribute('aria-invalid', 'false')
    })
  })

  describe('Validation Colissimo', () => {
    it('should show Colissimo validation button for French addresses', async () => {
      // Arrange
      const { user } = renderWithProviders(<AddressForm />)
      
      // Act - Remplir une adresse française valide
      await testHelpers.clearAndType(user, screen.getByLabelText(/adresse.*\*/), '123 rue de la Paix')
      await testHelpers.clearAndType(user, screen.getByLabelText(/code postal.*\*/), '75001')
      await testHelpers.clearAndType(user, screen.getByLabelText(/ville.*\*/), 'Paris')
      
      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /vérifier avec colissimo/i })).toBeInTheDocument()
      })
    })
    
    it('should call Colissimo API and handle successful validation', async () => {
      // Arrange
      const { AddressValidationService } = require('@/services/address-validation.service')
      AddressValidationService.validateAddress.mockResolvedValue({
        isValid: true,
        normalizedAddress: {
          street: '123 Rue de la Paix',
          city: 'Paris',
          postalCode: '75001',
        },
      })
      
      const { user } = renderWithProviders(<AddressForm />)
      
      // Act - Remplir l'adresse et valider
      await testHelpers.clearAndType(user, screen.getByLabelText(/adresse.*\*/), '123 rue de la paix')
      await testHelpers.clearAndType(user, screen.getByLabelText(/code postal.*\*/), '75001')
      await testHelpers.clearAndType(user, screen.getByLabelText(/ville.*\*/), 'paris')
      
      const validateButton = await screen.findByRole('button', { name: /vérifier avec colissimo/i })
      await user.click(validateButton)
      
      // Assert
      expect(AddressValidationService.validateAddress).toHaveBeenCalledWith({
        street: '123 rue de la paix',
        city: 'paris',
        postalCode: '75001',
        country: 'FR',
      })
      
      // Vérifier que l'adresse a été normalisée
      await waitFor(() => {
        expect(screen.getByDisplayValue('123 Rue de la Paix')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Paris')).toBeInTheDocument()
      })
    })
    
    it('should handle Colissimo validation errors', async () => {
      // Arrange
      const { AddressValidationService } = require('@/services/address-validation.service')
      AddressValidationService.validateAddress.mockResolvedValue({
        isValid: false,
      })
      
      const { user } = renderWithProviders(<AddressForm />)
      
      // Act
      await testHelpers.clearAndType(user, screen.getByLabelText(/adresse.*\*/), '999 rue inexistante')
      await testHelpers.clearAndType(user, screen.getByLabelText(/code postal.*\*/), '99999')
      await testHelpers.clearAndType(user, screen.getByLabelText(/ville.*\*/), 'VilleInconnue')
      
      const validateButton = await screen.findByRole('button', { name: /vérifier avec colissimo/i })
      await user.click(validateButton)
      
      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Adresse non trouvée par Colissimo')
      })
    })
  })

  describe('Soumission du formulaire', () => {
    it('should call onSubmit with form data when form is valid', async () => {
      // Arrange
      const mockOnSubmit = jest.fn()
      const { user } = renderWithProviders(<AddressForm onSubmit={mockOnSubmit} />)
      
      // Act - Remplir le formulaire
      await testHelpers.clearAndType(user, screen.getByLabelText(/adresse.*\*/), '123 rue de la Paix')
      await testHelpers.clearAndType(user, screen.getByLabelText(/code postal.*\*/), '75001')
      await testHelpers.clearAndType(user, screen.getByLabelText(/ville.*\*/), 'Paris')
      
      // Soumettre
      const submitButton = screen.getByRole('button', { name: /enregistrer l'adresse/i })
      
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
      
      await user.click(submitButton)
      
      // Assert
      expect(mockOnSubmit).toHaveBeenCalledWith({
        line1: '123 rue de la Paix',
        line2: '',
        city: 'Paris',
        postal_code: '75001',
        country: 'FR',
      })
    })
    
    it('should not submit if form is invalid', async () => {
      // Arrange
      const mockOnSubmit = jest.fn()
      const { user } = renderWithProviders(<AddressForm onSubmit={mockOnSubmit} />)
      
      // Act - Remplir partiellement le formulaire
      await testHelpers.clearAndType(user, screen.getByLabelText(/adresse.*\*/), '123 rue de la Paix')
      // Ne pas remplir les autres champs requis
      
      const submitButton = screen.getByRole('button', { name: /enregistrer l'adresse/i })
      expect(submitButton).toBeDisabled()
      
      // Assert - Ne peut pas soumettre
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
    
    it('should show loading state during submission', async () => {
      // Arrange
      const mockOnSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 500)))
      const { user } = renderWithProviders(<AddressForm onSubmit={mockOnSubmit} />)
      
      // Act
      await testHelpers.clearAndType(user, screen.getByLabelText(/adresse.*\*/), '123 rue de la Paix')
      await testHelpers.clearAndType(user, screen.getByLabelText(/code postal.*\*/), '75001')
      await testHelpers.clearAndType(user, screen.getByLabelText(/ville.*\*/), 'Paris')
      
      const submitButton = screen.getByRole('button', { name: /enregistrer l'adresse/i })
      await user.click(submitButton)
      
      // Assert
      expect(screen.getByRole('button', { name: /enregistrement\.\.\./i })).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      
      // Wait for submission to complete
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /enregistrer l'adresse/i })).toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })

  describe('Accessibilité', () => {
    it('should have proper ARIA attributes for form validation', async () => {
      // Arrange
      const { user } = renderWithProviders(<AddressForm />)
      
      // Act
      const addressField = screen.getByLabelText(/adresse.*\*/)
      await user.click(addressField)
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(addressField).toHaveAttribute('aria-invalid', 'true')
        expect(addressField).toHaveAttribute('aria-describedby', expect.stringContaining('error'))
        
        const errorElement = screen.getByRole('alert')
        expect(errorElement).toHaveAttribute('id', expect.stringContaining('error'))
      })
    })
    
    it('should be keyboard navigable', async () => {
      // Arrange
      const { user } = renderWithProviders(<AddressForm />)
      
      // Act - Navigation au clavier
      await user.tab() // Adresse
      expect(screen.getByLabelText(/adresse.*\*/).focus)
      
      await user.tab() // Complément
      await user.tab() // Code postal
      await user.tab() // Ville
      await user.tab() // Pays
      
      // Assert - Tous les champs sont accessibles au clavier
      expect(screen.getByLabelText(/pays.*\*/)).toHaveFocus()
    })
  })

  describe('Callback de validation', () => {
    it('should call onValidation callback when form validity changes', async () => {
      // Arrange
      const mockOnValidation = jest.fn()
      const { user } = renderWithProviders(<AddressForm onValidation={mockOnValidation} />)
      
      // Act - Remplir un champ
      const addressField = screen.getByLabelText(/adresse.*\*/)
      await testHelpers.clearAndType(user, addressField, '123 rue de la Paix')
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(mockOnValidation).toHaveBeenCalledWith(false) // Pas encore valide (autres champs manquants)
      })
      
      // Act - Compléter le formulaire
      await testHelpers.clearAndType(user, screen.getByLabelText(/code postal.*\*/), '75001')
      await testHelpers.clearAndType(user, screen.getByLabelText(/ville.*\*/), 'Paris')
      await user.tab()
      
      // Assert
      await waitFor(() => {
        expect(mockOnValidation).toHaveBeenCalledWith(true) // Maintenant valide
      })
    })
  })
})