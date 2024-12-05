import { DatabaseUtils } from "../database";

describe("DatabaseUtils", () => {
  describe("getUpdateParams", () => {
    describe("when attribute keys are present", () => {
      const table = 'asset';

      const attributes = {
        "color": "Space Gray",
        "displaySize": "13.3\"",
        "keyboard": "US",
        "make": "Apple",
        "model": "MacBook Pro",
        "memory": "8 GB",
        "modelNumber": "A2159",
        "operatingSystem": "macOS Ventura", 
        "processor": "M1 Pro",
        "processorFrequency": "3.2 GHz",
        "storage": "512 GB",
        "storageType": "SSD",
      };

      it("includes them in the returned query", () => {
        const { query } = DatabaseUtils.getUpdateParams(
          table, 
          attributes
        );

        expect(query).toBe(
          "UPDATE asset SET color = $1, display_size = $2, keyboard = $3, make = $4, model = $5, memory = $6, model_number = $7, operating_system = $8, processor = $9, processor_frequency = $10, storage = $11, storage_type = $12 WHERE id = $13;"
        );
      });

      it("includes them in the return params", () => {
        const { params } = DatabaseUtils.getUpdateParams(
          table, 
          attributes
        );

        expect(params).toEqual([
          attributes.color,
          attributes.displaySize,
          attributes.keyboard,
          attributes.make,
          attributes.model,
          attributes.memory,
          attributes.modelNumber,
          attributes.operatingSystem,
          attributes.processor,
          attributes.processorFrequency,
          attributes.storage,
          attributes.storageType,
        ]);
      });
    });

    describe("when attribute keys are not present", () => {
      const table = 'asset';

      const attributes = {
        "color": "Space Gray",
        "displaySize": "13.3\"",
      };

      it("does not include them in the return query", () => {
        const { query } = DatabaseUtils.getUpdateParams(table, attributes);

        expect(query).toBe("UPDATE asset SET color = $1, display_size = $2 WHERE id = $3;");
      });

      it("does not include them in the return params", () => {
        const { params } = DatabaseUtils.getUpdateParams(table, attributes);

        expect(params).toEqual([
          attributes.color,
          attributes.displaySize,
        ]);
      });
    });
  });
});