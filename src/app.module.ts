import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { LeadsModule } from './leads/leads.module';
import { MessagesModule } from './messages/messages.module';
import { ProjectsModule } from './projects/projects.module';
import { QuotesModule } from './quotes/quotes.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    AuthorizationModule,
    LeadsModule,
    MessagesModule,
    QuotesModule,
    HealthModule,
  ],
})
export class AppModule {}
