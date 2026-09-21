import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./AppModule";
import { PlatformExceptionFilter } from "./infrastructure/http/PlatformExceptionFilter";

export class BootstrapApplication {
  public static async run(): Promise<void> {
    const application = await NestFactory.create<NestExpressApplication>(
      AppModule,
    );
    application.useStaticAssets(join(__dirname, "public", "panel"), {
      prefix: "/panel/",
    });
    application.getHttpAdapter().get("/panel", (_request, response) => {
      response.redirect("/panel/index.html");
    });
    application.getHttpAdapter().get("/", (_request, response) => {
      response.redirect("/panel/index.html");
    });
    application.setGlobalPrefix("api/v1");
    application.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    application.useGlobalFilters(new PlatformExceptionFilter());
    const configService = application.get(ConfigService);
    const port = configService.get<string>("PORT") ?? "3010";
    await application.listen(port);
  }
}

void BootstrapApplication.run();
