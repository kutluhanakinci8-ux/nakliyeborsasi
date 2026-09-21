import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./AppModule";
import { PlatformExceptionFilter } from "./infrastructure/http/PlatformExceptionFilter";

export class BootstrapApplication {
  public static async run(): Promise<void> {
    const application = await NestFactory.create(AppModule);
    application.setGlobalPrefix("api/v1");
    application.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    application.useGlobalFilters(new PlatformExceptionFilter());
    const port = process.env.PORT ?? "3000";
    await application.listen(port);
  }
}

void BootstrapApplication.run();
