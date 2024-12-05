import { Client } from "pg";
import { AssetRow } from "./model-parser";
import { DatabaseUtils } from "../utils/database/database";
import { FileReportingUtils } from "../utils/files/reporting";

interface AssetUpload {
    'ASSET NUMBER': string;
    'ASSIGNEE FIRST NAME (ADD ONLY)': string | undefined;
    'ASSIGNEE LAST NAME (ADD ONLY)': string | undefined;
    'COLOR': string | undefined;
    'CONDITION': string | undefined;
    'DEVICE PHOTOS': string | undefined;
    'DISPLAY SIZE': string | undefined;
    'HAS CHARGER': string | undefined;
    'IMEI': string | undefined;
    'KEYBOARD CONFIGURATION': string | undefined;
    'MAKE': string | undefined;
    'MEMORY': string | undefined;
    'MODEL': string | undefined;
    'MODEL NUMBER': string | undefined;
    'NOTES / KNOWN ISSUES': string | undefined;
    'OPERATING SYSTEM': string | undefined;
    'ORGANIZATION': string;
    'ORGANIZATION ID': string;
    'PERSONAL EMAIL (ADD ONLY)': string | undefined;
    'PROCESSOR': string | undefined;
    'PROCESSOR FREQUENCY': string | undefined;
    'PURCHASE DATE': string | undefined;
    'RELEASE DATE': string | undefined;
    'REMOVE DEVICE PHOTOS (CHECKBOX)': string;
    'SERIAL NUMBER': string | undefined;
    'STATUS': string;
    'STORAGE': string | undefined;
    'STORAGE TYPE': string | undefined;
    'TECHNICAL FUNCTIONALITY': string | undefined;
    'TYPE': string;
    'WARRANTY EXPIRATION DATE': string | undefined;
    'WORK EMAIL (ADD ONLY)': string | undefined;
}

interface AssetType {
    name: string;
}

interface Assignee {
    first_name: string;
    last_name: string;
    personal_email: string;
    work_email: string;
    email: string;
}

interface Organization {
    name: string;
    id: string;
}

const assetUploadColumns = [
    'ASSET NUMBER',
    'ORGANIZATION',
    'ORGANIZATION ID',
    'ASSIGNEE FIRST NAME (ADD ONLY)',
    'ASSIGNEE LAST NAME (ADD ONLY)',
    'PERSONAL EMAIL (ADD ONLY)',
    'WORK EMAIL (ADD ONLY)',
    'STATUS',
    'TYPE',
    'CONDITION',
    'MAKE',
    'MODEL',
    'MODEL NUMBER',
    'DISPLAY SIZE',
    'SERIAL NUMBER',
    'PROCESSOR',
    'PROCESSOR FREQUENCY',
    'MEMORY',
    'STORAGE',
    'KEYBOARD CONFIGURATION',
    'COLOR',
    'PURCHASE DATE',
    'WARRANTY EXPIRATION DATE',
    'RELEASE DATE',
    'TECHNICAL FUNCTIONALITY',
    'STORAGE TYPE',
    'OPERATING SYSTEM',
    'IMEI',
    'HAS CHARGER',
    'NOTES / KNOWN ISSUES',
    'DEVICE PHOTOS',
    'REMOVE DEVICE PHOTOS (CHECKBOX)',
]

export class AssetUploadCreator {
    private port: number;
    private assetUpload: AssetUpload[] = [];

    constructor(port: number) {
        this.port = port;
    }

   async setDBCient(port: number): Promise<Client> {
      return DatabaseUtils.getMonoDatabaseClient(port);
  }

   async createAssetUpload(rawAssets: AssetRow[]): Promise<boolean> {
     const uploadCreated = await Promise.resolve(rawAssets.reduce((acc: Promise<boolean>, rawAsset): Promise<boolean> => {
        const processSingleAssetUpload = async (rawAsset: AssetRow): Promise<boolean> => {
          try {
            const organization: Organization = await this.getOrganization(rawAsset);

            const assetType: AssetType = await this.getAssetType(rawAsset);

            let assignee: Assignee | undefined = undefined;

            if (rawAsset.assignee_id) {
                assignee = await this.getAssignee(rawAsset);
            }

            this.assetUpload.push({
              'ASSET NUMBER': rawAsset.asset_number,
              'ASSIGNEE FIRST NAME (ADD ONLY)': assignee?.first_name || '',
              'ASSIGNEE LAST NAME (ADD ONLY)': assignee?.last_name || '',
              'COLOR': rawAsset.color ?? undefined,
              'CONDITION': rawAsset.cosmetic_condition || '',
              'DISPLAY SIZE': rawAsset.display_size || '',
              'HAS CHARGER': rawAsset.has_charger ? 'TRUE' : 'FALSE',
              'IMEI': rawAsset.imei_number || '',
              'KEYBOARD CONFIGURATION': rawAsset.keyboard || '',
              'MAKE': rawAsset.make || '',
              'MEMORY': rawAsset.memory || '',
              'MODEL': rawAsset.model || '',
              'MODEL NUMBER': rawAsset.model_number || '',
              'NOTES / KNOWN ISSUES': rawAsset.customer_note || '',
              'OPERATING SYSTEM': rawAsset.operating_system || '',
              'ORGANIZATION': organization.name,
              'ORGANIZATION ID': organization.id,
              'PERSONAL EMAIL (ADD ONLY)': assignee?.personal_email || assignee?.email,
              'PROCESSOR': rawAsset.processor || '',
              'PROCESSOR FREQUENCY': rawAsset.processor_frequency || '',
              'PURCHASE DATE': rawAsset.purchase_date?.toISOString(),
              'RELEASE DATE': rawAsset.release_date?.toISOString(),
              'REMOVE DEVICE PHOTOS (CHECKBOX)': 'FALSE',
              'SERIAL NUMBER': rawAsset.serial_number || '',
              'STATUS': rawAsset.status,
              'STORAGE': rawAsset.storage || '',
              'STORAGE TYPE': rawAsset.storage_type || '',
              'TECHNICAL FUNCTIONALITY': rawAsset.technical_functionality || '',
              'TYPE': assetType.name || '',
              'WARRANTY EXPIRATION DATE': rawAsset.warranty_expiration?.toISOString(),
              'WORK EMAIL (ADD ONLY)': assignee?.work_email || assignee?.email,
              'DEVICE PHOTOS': '',
            });

            return true;
          } catch (error) {
            console.error(`Failed to create asset upload for asset number: ${rawAsset.asset_number}`);
            console.error(error);
            return false;
          }
        };

        return acc.then((status) => status ? processSingleAssetUpload(rawAsset) : Promise.resolve(false));
      }, Promise.resolve(Promise.resolve(true))));

      if (uploadCreated && this.assetUpload) {
        console.log('Successfully created asset upload');
        return true;
      }

      console.error('Failed to create asset upload');
      return false;

   }


   printAssetUploadFile () {
    if (!this.assetUpload) {
      console.error('No asset upload to print');
      return;
    }

    const organization = this.assetUpload[0].ORGANIZATION;

    const datetime = new Date().toISOString().replace(/(?:\.\d{3}Z)|(?:[^\d])/g, '');

    const filePath = FileReportingUtils
      .getFilePath(`asset-upload-${organization}`, this.assetUpload.length)
      .replace('.csv', `_${datetime}.csv`);

    FileReportingUtils.exportCsv({
      filePath,
      data: this.assetUpload.map((upload) => ({ ...upload })),
      options: {
        columns: assetUploadColumns,
        header: true,
        fromLine: 0,
      }
    });
  }

    async getOrganization(asset: AssetRow): Promise<Organization> {
      const client = await this.setDBCient(this.port);

      client.connect();


      let result = await client.query(
        `SELECT * FROM organization where id = '${asset.organization_id}'`,
      );

      client.end();

      return result.rows[0];
    }

    async getAssignee(asset: AssetRow): Promise<Assignee> {
      const client = await this.setDBCient(this.port);

      client.connect();

  
      let result = await client.query(
        `SELECT * FROM collaborator where id = '${asset.assignee_id}'`,
      );

      client.end();

      return result.rows[0];
    }

    async getAssetType(asset: AssetRow): Promise<AssetType> {
        const client = await this.setDBCient(this.port);

        client.connect();
  
    
        let result = await client.query(
          `SELECT * FROM asset_type where id = '${asset.asset_type_id}'`,
        );

        client.end();
  
        return result.rows[0];
    }

}