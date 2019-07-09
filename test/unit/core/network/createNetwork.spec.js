/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import createNetwork from "../../../../src/core/network/createNetwork";

describe("createNetwork", () => {
  const config = {
    edgeDomain: "alloy.mysite.com",
    propertyID: "mypropertyid"
  };

  const logger = console;

  const lifecycle = {
    onBeforeSend: () => Promise.resolve(),
    onResponse: () => Promise.resolve()
  };

  const mockResponse = { requestId: "myrequestid", handle: [] };

  let network;
  let networkStrategy;

  beforeEach(() => {
    spyOn(lifecycle, "onBeforeSend").and.callThrough();
    spyOn(lifecycle, "onResponse").and.callThrough();
    networkStrategy = jasmine
      .createSpy()
      .and.returnValue(Promise.resolve(JSON.stringify(mockResponse)));
    network = createNetwork(config, logger, lifecycle, networkStrategy);
  });

  it("calls interact by default", () => {
    return network.sendRequest({}, true).then(() => {
      expect(networkStrategy).toHaveBeenCalledWith(
        "https://alloy.mysite.com/v1/interact?propertyID=mypropertyid",
        "{}",
        true
      );
    });
  });

  it("can call collect", () => {
    return network.sendRequest({}, false).then(() => {
      expect(networkStrategy).toHaveBeenCalledWith(
        "https://alloy.mysite.com/v1/collect?propertyID=mypropertyid",
        "{}",
        false
      );
    });
  });

  it("sends the payload", () => {
    return network.sendRequest({ id: "mypayload" }, true).then(() => {
      expect(JSON.parse(networkStrategy.calls.argsFor(0)[1])).toEqual({
        id: "mypayload"
      });
    });
  });

  it("logs the request and response when response is expected", () => {
    spyOn(logger, "log");
    const payload = { id: "mypayload2" };
    return network.sendRequest(payload, true).then(() => {
      expect(logger.log).toHaveBeenCalledWith(
        jasmine.stringMatching(/^Request .+: Sending request.$/),
        JSON.parse(JSON.stringify(payload))
      );
      expect(logger.log).toHaveBeenCalledWith(
        jasmine.stringMatching(/^Request .+: Received response.$/),
        mockResponse
      );
    });
  });

  it("logs only the request when no response is expected", () => {
    spyOn(logger, "log");
    const payload = { id: "mypayload2" };
    return network.sendRequest(payload, false).then(() => {
      expect(logger.log).toHaveBeenCalledWith(
        jasmine.stringMatching(
          /^Request .+: Sending request \(no response is expected\).$/
        ),
        JSON.parse(JSON.stringify(payload))
      );
      expect(logger.log.calls.count()).toBe(1);
    });
  });

  it("resolves the returned promise", () => {
    return network.sendRequest({}, true).then(response => {
      expect(response.getPayloadByType).toEqual(jasmine.any(Function));
    });
  });

  it("rejects the returned promise", () => {
    networkStrategy.and.returnValue(Promise.reject(new Error("myerror")));
    return network
      .sendRequest({}, true)
      .then(() => {
        throw Error("Expecting sendRequest to fail.");
      })
      .catch(error => {
        expect(error.message).toEqual("myerror");
      });
  });

  it("rejects the promise when response is invalid json", () => {
    networkStrategy.and.returnValue(Promise.resolve("badbody"));
    return network
      .sendRequest({}, true)
      .then(() => {
        throw Error("Expecting sendRequest to fail.");
      })
      .catch(e => {
        // The native parse error message is different based on the browser
        // so we'll just check to parts we control.
        expect(e.message).toContain("Error parsing server response.\n");
        expect(e.message).toContain("\nResponse body: badbody");
      });
  });

  it("allows components to handle the response", () => {
    const myresponse = {
      requestId: "myrequestid",
      handle: [
        {
          type: "mytype",
          payload: { id: "myfragmentid" }
        }
      ]
    };
    lifecycle.onResponse.and.callFake(response => {
      const cleanResponse = response.toJSON();
      expect(cleanResponse).toEqual(myresponse);
      return Promise.resolve();
    });
    networkStrategy.and.returnValue(
      Promise.resolve(JSON.stringify(myresponse))
    );
    return network.sendRequest({}, true).then(() => {
      expect(lifecycle.onResponse).toHaveBeenCalled();
    });
  });

  it("doesn't try to parse the response on a beacon call", () => {
    networkStrategy.and.returnValue(Promise.resolve("bar"));
    // a failed promise will fail the test
    return network.sendRequest({}, false);
  });
});
