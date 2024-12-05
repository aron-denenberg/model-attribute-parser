import { ModelParser } from "../model-parser";

describe("ModelParser", () => {
  describe("getUpdateQuery", () => {
    describe("when attribute keys are present", () => {
      it("includes them", () => {
        const modelParser = new ModelParser({
          cleanup: false,
          dryRun: false,
          port: 5432,
          save: false,
        });

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

        const query = modelParser.getUpdateQuery(attributes);

        expect(query).toBe(
          "UPDATE asset SET color = $1, display_size = $2, keyboard = $3, make = $4, model = $5, memory = $6, model_number = $7, operating_system = $8, processor = $9, processor_frequency = $10, storage = $11, storage_type = $12 WHERE id = $13;"
        );
      });
    });

    describe("when attribute keys are not present", () => {
      it("does not include them", () => {
        const modelParser = new ModelParser({
          cleanup: false,
          dryRun: false,
          port: 5432,
          save: false,
        });

        const attributes:  = [
          "color",
          "displaySize",
        ];

        const query = modelParser.getUpdateQuery(attributes);

        expect(query).toBe("UPDATE asset SET WHERE id = $1;");
      });
    });
  });
});