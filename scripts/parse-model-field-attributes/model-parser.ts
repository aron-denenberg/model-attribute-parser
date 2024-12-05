import OpenAI from 'openai';
import { DatabaseUtils } from "../utils/database/database";
import { FileReportingUtils } from "../utils/files/reporting";
import { AssetUploadCreator } from './asset-upload-creator';

require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

interface AssetAttributes {
  color?: string;
  displaySize?: string;
  keyboard?: string;
  make?: string;
  memory?: string;
  model?: string;
  modelNumber?: string;
  operatingSystem?: string;
  processor?: string;
  processorFrequency?: string;
  storage?: string;
  storageType?: string;
};

export interface ParsedAsset extends AssetAttributes {
  id: string;
  asset_number: string;
  input: string;
};

export type AssetRow = {
  id: string;
  asset_number: string;
  serial_number: string | undefined;
  organization_id: string;
  assignee_id: string | undefined;
  depot_id: string | undefined;
  asset_type_id: string;
  product_variant_id: string | undefined;
  color: string | undefined;
  display_size: string | undefined;
  processor: string | undefined;
  memory: string | undefined;
  storage: string | undefined;
  keyboard: string | undefined;
  notes: string | undefined;
  cosmetic_condition: string;
  status: string;
  data_status: string;
  technical_functionality: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | undefined;
  make: string | undefined;
  model: string;
  model_number: string | undefined;
  warranty_expiration: Date | undefined;
  device_assessment: string;
  acumatica_id: string | undefined;
  purchase_date: Date | undefined;
  is_warranty_expiration_verified: boolean;
  is_purchase_date_verified: boolean;
  customer_note: string | undefined;
  operating_system: string | undefined;
  release_date: Date | undefined;
  processor_frequency?: string | undefined;
  storage_type?: string | undefined;
  has_charger?: boolean;
  imei_number?: string | undefined;
}

export class ModelParser {
  aiClient: OpenAI;
  aiAssistant: OpenAI.Beta.Assistants.Assistant;

  cleanup: boolean = false;
  dryRun: boolean = false;
  port: number;
  save: 'direct' | 'upload' | '' = '';
  organizationId: string = '';
  lastCreatedAt: string = '';

  errorRows: { error: Error, data: ParsedAsset }[] = [];
  affectedAssetsMap: Map<string, { data: ParsedAsset }> = new Map();

  constructor(params: {
    cleanup: boolean,
    dryRun: boolean,
    port: number,
    save: 'direct' | 'upload' | '',
    organizationId: string,
    lastCreatedAt: string,
  }) {
    this.aiClient = new OpenAI({
      project: 'proj_lLBZGSKFIQSflXitDEjM7Aom'
    });

    this.cleanup = params.cleanup;
    this.dryRun = params.dryRun;
    this.port = params.port;
    this.save = params.save;
    this.organizationId = params.organizationId;
    this.lastCreatedAt = params.lastCreatedAt;
  }

  async run() {
    this.aiAssistant = await this.aiClient
      .beta
      .assistants
      .retrieve('asst_209I8XHekucF5AWArrloee5W');

      const thread = await this.createAssetAssistantThread();

    const assets = await this.getAllAssets(this.organizationId, this.lastCreatedAt);

    let runCount = 2;

    while (runCount > 0) {
      runCount--;
      let trainableAssets = assets.filter((asset) => {
        const existingRow = this.affectedAssetsMap.get(asset.id);
        
        return !existingRow || (existingRow?.data?.input?.length > 20 && !existingRow?.data?.make);
      });
      


    for (const asset of trainableAssets) {
      console.log(asset);

      // If there's no model field to parse
      if (!asset.model) {
        // Log that model was skipped
        console.log(`Skipping asset ${asset.asset_number}, no model value`);
        
        continue;
      }

      console.log(`Parsing model field for asset: ${asset.asset_number}`);
      
      try {
        // Parse attributes from model field
        await this.processAsset(asset, thread);
      } catch (error) {
        // Log error and add to error rows
        console.error(error);

        this.errorRows.push({
          error,
          data: {
            asset_number: asset.asset_number,
            id: asset.id,
            input: asset.model,
          },
        });
      }
    }
  }

  if (this.save) {
    const processableAssets = assets.filter((asset) => this.affectedAssetsMap.has(asset.id)).map((asset) => this.mergeAssetData(asset, this.affectedAssetsMap.get(asset.id)!.data));
    // Update asset fields with parsed attributes
    if (this.save === 'direct') {
      Promise.all(processableAssets.map(async(asset) => {
        const attributes = Object.entries(this.affectedAssetsMap.get(asset.id)?.data || {}).reduce((acc, [key, value]) => {
          if (asset[key.replace(/([A-Z])/g, "_$1").toLowerCase()] !== value) {
            acc[key] = value;
          }
          return acc;
        }, {} as AssetAttributes);
         if (attributes) await this.updateAsset(asset.id, attributes);
      }));
    }

    if(this.save === 'upload') {
      // create upload file
      const assetUploadCreator = new AssetUploadCreator(this.port);
      const uploadable =  await assetUploadCreator.createAssetUpload(processableAssets);
      if (uploadable) {
        assetUploadCreator.printAssetUploadFile();
      }
    }
  }
    const affectedRows: { data: ParsedAsset }[] = [];

    this.affectedAssetsMap.forEach((value, key) => {
      affectedRows.push(value);
    });

    console.log(affectedRows);



    FileReportingUtils.generateSuccessAndErrorFiles<ParsedAsset>({
      baseFileName: 'model-attribute-mapping',
      errors: {
        rows: this.errorRows,
        columns: [
          'asset_number',
          'id',
          'input',
        ],
      },
      successes: {
        rows: affectedRows,
        columns: [
          'asset_number',
          'id',
          'input',
          'color',
          'displaySize',
          'keyboard',
          'make',
          'model',
          'memory',
          'modelNumber',
          'operatingSystem',
          'processor',
          'processorFrequency',
          'storage',
          'storageType',
        ],
      },
    });
  }

  private async processAsset(asset: AssetRow, thread: OpenAI.Beta.Threads.Thread) {
    let attributes = await this.parseModelFieldAttributes(thread, asset.model);

    const data = {
        asset_number: asset.asset_number,
        id: asset.id,
        input: asset.model,
        color: attributes.color,
        displaySize: attributes.displaySize,
        keyboard: attributes.keyboard,
        make: attributes.make,
        model: attributes.model,
        memory: attributes.memory,
        modelNumber: attributes.modelNumber,
        operatingSystem: attributes.operatingSystem,
        processor: attributes.processor,
        processorFrequency: attributes.processorFrequency,
        storage: attributes.storage,
        storageType: attributes.storageType,
    };

    this.affectedAssetsMap.set(asset.id, { data });

    // Add or replace the record to the affected asset array for success logging
  }

  private async updateAsset(assetId: string, attributes: AssetAttributes) {
    const databaseClient = await DatabaseUtils.getMonoDatabaseClient(this.port);
    await databaseClient.connect();

    let {
      query,
      params
    } = DatabaseUtils.getUpdateParams('asset', attributes, assetId);

    console.log(query);

    await databaseClient.query(
      query,
      params
    );

    databaseClient.end();
  }

  async getAllAssets(organizationId: string, lastCreatedAt: string): Promise<AssetRow[]> {
    const databaseClient = await DatabaseUtils.getMonoDatabaseClient(this.port);
    await databaseClient.connect();

    console.log('Loading assets...');
  
    let result = await databaseClient.query(
      `SELECT * FROM asset
      where deleted_at is null ${organizationId ? 'and organization_id = \'' + organizationId + '\' ' : ''}${lastCreatedAt ? 'and created_at < \'' + lastCreatedAt + '\' ' : ''}
      order by created_at desc limit 1000;`,
    );
  
    databaseClient.end();
  
    return result.rows;
  }

  async createAssetAssistantThread(): Promise<OpenAI.Beta.Threads.Thread> {
    return await this.aiClient.beta.threads.create({
      messages: [
        {
          // Sometimes the parser includes extra fluff text in the response, so we need to filter it out
          role: 'user',
          content: 'Do not wrap JSON code in JSON markers. When mapping to a JSON string, only return the object itself.'
        },
        {
          // Sometimes the parser does not follow the standard, so we need to remind it
          role: 'user',
          content: 'The allwhere asset data standard is described in the file named ""H5-Proposal_ Asset Data Standard-260624-155652". DO NOT ASSUME VALUES FOR FIELDS THAT ARE NOT PRESENT.'
        },
        {
          // Additional context to help the parser when only the model number field is present
          role: 'user',
          content: 'When mapping to the fields of the asset data standard, it\'s possible that only the model number field is present'
        },
        { 
          // Context to help identify device cases vs devices
          role: 'user',
          content: 'When mapping to the fields of the asset data standard, if the provided string includes the word "case", it refers to a device case and not a device itself'
        },
        {
          // Additional context to help locate the model number field for Apple assets
          role: 'user',
          content: 'When mapping to the fields of the asset data standard, the model number is often found before or after the display size of the input string'
        },
        {
          // Additional formatting for Apple processors
          role: 'user',
          content: 'When mapping to the fields of the asset data standard, do not include "Apple" for M series processors'
        },
        {
          // ensure that the assistant defers to the make whitelist
          role: 'user',
          content: 'The file named "Make Whitelist" contains a list of valid make values. These are the most common makes, but there may be others not listed.'
        }
      ],
    });
  }

  async getModelMessageIdFromThread(thread: OpenAI.Beta.Threads.Thread): Promise<string | undefined> {
    const messages = await this.aiClient.beta.threads.messages.list(thread.id);

    const modelMessage = messages.data.find((message) => {
      return message.content[0]['text']?.value?.includes('Map the following line of text into a JSON');
    });

    return modelMessage?.id;
  }

  async parseModelFieldAttributes(thread: OpenAI.Beta.Threads.Thread, model: string): Promise<AssetAttributes> {
    await this.aiClient.beta.threads.messages.create(thread.id, 
        {
          role: 'user',
          content: `Map the following line of text into a JSON string with the color, display size, keyboard, make, model, memory, model number, operating system, processor, processor frequency, storage, and storage type fields defined in the allwhere asset data standard: ${model}`,
        },
    );

    const run = await this.aiClient.beta.threads.runs.create(thread.id, {
      assistant_id: this.aiAssistant.id,
    });

    let runStatus = await this.aiClient.beta.threads.runs.retrieve(
      thread.id,
      run.id
    );

    let tries = 0

    while (runStatus.status !== "completed" && tries < 10) {
      tries++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      runStatus = await this.aiClient.beta.threads.runs.retrieve(thread.id, run.id);
    }

    if (runStatus.status !== "completed") {
      throw new Error(`Run ${run.id} did not complete in time: ${model}`);
    }

    const messages = await this.aiClient.beta.threads.messages.list(thread.id);

    const lastMessageForRun = messages.data
        .filter(
          (message) => message.run_id === run.id && message.role === "assistant"
        )
        .pop();

    const response = lastMessageForRun?.content[0]['text']?.value?.match(/\{[^}]*\}/g)?.[0];

    if (!response) {
      throw new Error(`Unexpected value returned by AI parser: ${lastMessageForRun?.content[0]['text']?.value}`);
    }

    console.log(response);

    const attributes = JSON.parse(response);

    return {
      model: attributes.model && this.cleanup ? attributes.model : model,
      ...(attributes.color && { color: attributes.color }),
      ...(attributes.displaySize && { displaySize: attributes.displaySize }),
      ...(attributes.keyboard && { keyboard: attributes.keyboard }),
      ...(attributes.make && { make: attributes.make }),
      ...((attributes.model && this.cleanup) && { model: attributes.model }),
      ...(attributes.memory && { memory: attributes.memory }),
      ...(attributes.modelNumber && { modelNumber: attributes.modelNumber }),
      ...(attributes.operatingSystem && { operatingSystem: attributes.operatingSystem }),
      ...(attributes.processor && { processor: attributes.processor }),
      ...(attributes.processorFrequency && { processorFrequency: attributes.processorFrequency }),
      ...(attributes.storage && { storage: attributes.storage }),
      ...(attributes.storageType && { storageType: attributes.storageType }),
    };
  }

  mergeAssetData(assetRow: AssetRow, attributes: ParsedAsset): AssetRow {
    return {
      ...assetRow,
      model: attributes.model || assetRow.model,
      make: assetRow.make || attributes.make,
      model_number: assetRow.model_number || attributes.modelNumber,
      color: assetRow.color || attributes.color,
      storage: assetRow.storage || attributes.storage,
      storage_type: assetRow.storage_type || attributes.storageType,
      display_size: assetRow.display_size || attributes.displaySize,
      processor: assetRow.processor || attributes.processor,
      processor_frequency: assetRow.processor_frequency || attributes.processorFrequency,
      memory: assetRow.memory || attributes.memory,
      operating_system: assetRow.operating_system || attributes.operatingSystem,
      keyboard: assetRow.keyboard || attributes.keyboard,
    }
 };
}