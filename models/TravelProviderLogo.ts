import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { sequelize } from "../lib/db/sequelize";

export const TRAVEL_PROVIDER_CATEGORIES = [
  "rail",
  "hotel",
  "car_rental",
  "cruise",
  "flight",
] as const;

export type TravelProviderCategory = (typeof TRAVEL_PROVIDER_CATEGORIES)[number];

export class TravelProviderLogo extends Model<
  InferAttributes<TravelProviderLogo>,
  InferCreationAttributes<TravelProviderLogo>
> {
  declare id: CreationOptional<number>;
  declare category: TravelProviderCategory;
  declare providerName: string;
  declare providerCode: CreationOptional<string | null>;
  declare logoUrl: string;
  declare websiteUrl: CreationOptional<string | null>;
  declare altText: string;
  declare displayOrder: CreationOptional<number>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TravelProviderLogo.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category: { type: DataTypes.ENUM(...TRAVEL_PROVIDER_CATEGORIES), allowNull: false },
    providerName: { type: DataTypes.STRING, allowNull: false, field: "provider_name" },
    providerCode: { type: DataTypes.STRING(20), allowNull: true, field: "provider_code" },
    logoUrl: { type: DataTypes.TEXT, allowNull: false, field: "logo_url" },
    websiteUrl: { type: DataTypes.TEXT, allowNull: true, field: "website_url" },
    altText: { type: DataTypes.STRING, allowNull: false, field: "alt_text" },
    displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: "display_order" },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "is_active" },
    createdAt: { type: DataTypes.DATE, field: "created_at" },
    updatedAt: { type: DataTypes.DATE, field: "updated_at" },
  },
  { sequelize, tableName: "travel_provider_logos", modelName: "TravelProviderLogo" }
);
