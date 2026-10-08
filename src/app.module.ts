import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccessRequestsModule } from './access-requests/access-requests.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { ClientsModule } from './clients/clients.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './db/database.module';
import { HealthModule } from './health/health.module';
import { LeadsModule } from './leads/leads.module';
import { MessagesModule } from './messages/messages.module';
import { ProductsModule } from './products/products.module';
import { ProjectsModule } from './projects/projects.module';
import { QuotesModule } from './quotes/quotes.module';
import { UserProfileModule } from './users/user-profile.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    DatabaseModule,
    UsersModule,
    UserProfileModule,
    AuthModule,
    AccessRequestsModule,
    ProjectsModule,
    AuthorizationModule,
    LeadsModule,
    MessagesModule,
    QuotesModule,
    ProductsModule,
    ClientsModule,
    DashboardModule,
    HealthModule,
  ],
})
export class AppModule {}
