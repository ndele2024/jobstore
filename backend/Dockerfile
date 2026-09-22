# --- Etape 1 : restauration et publication ------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src

# Les .csproj d'abord : « restore » n'est rejoue que si les dependances changent.
COPY JobStore.Domain/*.csproj         JobStore.Domain/
COPY JobStore.Application/*.csproj    JobStore.Application/
COPY JobStore.Infrastructure/*.csproj JobStore.Infrastructure/
COPY JobStore.Api/*.csproj            JobStore.Api/
RUN dotnet restore JobStore.Api/JobStore.Api.csproj

COPY . .
RUN dotnet publish JobStore.Api/JobStore.Api.csproj \
      -c Release -o /app/publish --no-restore /p:UseAppHost=false

# --- Etape 2 : execution ------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS runtime
WORKDIR /app

# icu-libs : sans lui, .NET bascule en mode « globalisation invariante » et les
# comparaisons de chaines accentuees (noms, intitules de postes) deviennent fausses.
RUN apk add --no-cache icu-libs tzdata \
    && addgroup -S jobstore && adduser -S jobstore -G jobstore

ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    TZ=America/Toronto \
    ASPNETCORE_URLS=http://+:8080

COPY --from=build --chown=jobstore:jobstore /app/publish .

USER jobstore
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD wget -qO- http://127.0.0.1:8080/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["dotnet", "JobStore.Api.dll"]
