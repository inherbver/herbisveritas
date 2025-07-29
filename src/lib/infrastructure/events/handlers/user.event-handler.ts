/**
 * User Event Handler
 */

import { Result } from "@/lib/core/result";
import { BusinessError } from "@/lib/core/errors";
import type { DomainEvent, EventStore } from "@/lib/core/events";
import type { UserSupabaseRepository } from "../../repositories/user.supabase.repository";
import { logger } from "@/lib/core/logger";

export class UserEventHandler {
  constructor(
    private readonly userRepository: UserSupabaseRepository,
    private readonly eventStore: EventStore,
    private readonly logger: typeof logger
  ) {}

  async handle(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      switch (event.eventType) {
        case 'USER_REGISTERED':
          return await this.handleUserRegistered(event);
        case 'USER_PROFILE_UPDATED':
          return await this.handleUserProfileUpdated(event);
        default:
          this.logger.warn('Unhandled user event type', { eventType: event.eventType });
          return Result.ok(undefined);
      }
    } catch (error) {
      this.logger.error('User event handler error', { error, event });
      return Result.error(new BusinessError('User event handling failed', { error, event }));
    }
  }

  async handleUserRegistered(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      const { userId, email } = event.eventData;
      this.logger.info('Processing user registered', { userId, email, eventId: event.eventId });
      return Result.ok(undefined);
    } catch (error) {
      return Result.error(new BusinessError('Failed to process user registered event', { error }));
    }
  }

  async handleUserProfileUpdated(event: DomainEvent): Promise<Result<void, BusinessError>> {
    try {
      const { userId, updatedFields } = event.eventData;
      this.logger.info('Processing user profile updated', { userId, updatedFields, eventId: event.eventId });
      return Result.ok(undefined);
    } catch (error) {
      return Result.error(new BusinessError('Failed to process user profile updated event', { error }));
    }
  }
}