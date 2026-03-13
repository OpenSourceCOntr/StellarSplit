import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventsGateway, WsJwtAuthGuard, WsJwtAuthService } from "./events.gateway";

@Module({
  imports: [ConfigModule],
  providers: [WsJwtAuthService, WsJwtAuthGuard, EventsGateway],
  exports: [EventsGateway],
})
export class GatewayModule {}
