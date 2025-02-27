import { makeApprovedProjectData, makeRoundData } from "../../../test-utils"
import { ApplicationStatus, Round } from "../types"
import { fetchFromIPFS, graphql_fetch } from "../utils"
import { getRoundById, GetRoundByIdResult } from "../round"

jest.mock("../utils", () => ({
  ...jest.requireActual("../utils"),
  graphql_fetch: jest.fn(),
  fetchFromIPFS: jest.fn(),
}));

describe("getRoundById", () => {
  let expectedRoundData: Round;
  let expectedRound: Partial<Round>;
  let graphQLResult: GetRoundByIdResult;

  beforeEach(() => {
    jest.clearAllMocks();

    expectedRoundData = makeRoundData();
    expectedRound = {
      ...expectedRoundData
    };
    delete expectedRound.store;
    delete expectedRound.applicationStore;

    graphQLResult = {
      data: {
        rounds: [
          {
            id: expectedRoundData.id!,
            program: {
              id: expectedRoundData.ownedBy
            },
            roundMetaPtr: expectedRoundData.store!,
            applicationMetaPtr: expectedRoundData.applicationStore!,
            applicationsStartTime: convertDateToSecondsString(expectedRoundData.applicationsStartTime),
            applicationsEndTime: convertDateToSecondsString(expectedRoundData.applicationsEndTime),
            roundStartTime: convertDateToSecondsString(expectedRoundData.roundStartTime),
            roundEndTime: convertDateToSecondsString(expectedRoundData.roundEndTime),
            token: expectedRoundData.token,
            votingStrategy: expectedRoundData.votingStrategy,
            projectsMetaPtr: null,
            projects: []
          },
        ],
      }
    };

    (graphql_fetch as jest.Mock).mockResolvedValue(graphQLResult);
    (fetchFromIPFS as jest.Mock).mockImplementation((pointer: string) => {
      if (pointer === expectedRoundData.store?.pointer) {
        return expectedRoundData.roundMetadata
      }
      return {}
    });
  });

  it("calls the graphql endpoint and maps the metadata from IPFS", async () => {
    const actualRound = await getRoundById(expectedRoundData.id!, "someChain");

    expect(actualRound).toMatchObject(expectedRound);
    expect(graphql_fetch as jest.Mock).toBeCalledTimes(1);
    expect(fetchFromIPFS as jest.Mock).toBeCalledTimes(1);
    expect(fetchFromIPFS as jest.Mock).toBeCalledWith(expectedRoundData.store?.pointer);
  });

  describe("when round has approved projects", () => {
    const roundProjectStatuses = "round-project-metadata-ptr";
    const approvedProjectMetadataPointer = "my-project-metadata";
    const expectedApprovedApplication = makeApprovedProjectData();

    let graphQLResultWithApprovedApplication: GetRoundByIdResult;
    let roundMetadataIpfsResult: any;
    let roundProjectStatusesIpfsResult: any;

    beforeEach(() => {
      graphQLResultWithApprovedApplication = {
        data: {
          rounds: [
            {
              ...graphQLResult.data.rounds[0],
              projectsMetaPtr: { protocol: 1,
                pointer: roundProjectStatuses },
              projects: [
                {
                  id: expectedApprovedApplication.grantApplicationId,
                  project: expectedApprovedApplication.projectRegistryId,
                  metaPtr: {
                    protocol: 1,
                    pointer: approvedProjectMetadataPointer
                  }
                }
              ],
            },
          ],
        },
      }
      roundMetadataIpfsResult = expectedRound.roundMetadata
      roundProjectStatusesIpfsResult = [{
        id: expectedApprovedApplication.grantApplicationId,
        status: ApplicationStatus.APPROVED,
        payoutAddress: "some payout address"
      }]
    })

    it("maps approved project metadata for old application format", async () => {
      const oldFormat = {
        round: expectedRound.id,
        project: {
          ...expectedApprovedApplication.projectMetadata
        }
      };

      (graphql_fetch as jest.Mock).mockResolvedValue(graphQLResultWithApprovedApplication);
      (fetchFromIPFS as jest.Mock).mockImplementation((pointer: string) => {
        if (pointer === expectedRoundData.store?.pointer) {
          return roundMetadataIpfsResult
        }
        if (pointer === roundProjectStatuses) {
          return roundProjectStatusesIpfsResult
        }
        if (pointer === approvedProjectMetadataPointer) {
          return oldFormat
        }
        return {}
      });

      const actualRound = await getRoundById(expectedRoundData.id!, "someChain");

      expect(actualRound).toMatchObject(expectedRound);
    });

    it("maps approved project metadata for new application format", async () => {
      const newFormat = {
        signature: "some-signature",
        application: {
          round: expectedRound.id,
          project: {
            ...expectedApprovedApplication.projectMetadata,
          },
        },
      };
      (graphql_fetch as jest.Mock).mockResolvedValue(graphQLResultWithApprovedApplication);
      (fetchFromIPFS as jest.Mock).mockImplementation((pointer: string) => {
        if (pointer === expectedRoundData.store?.pointer) {
          return roundMetadataIpfsResult
        }
        if (pointer === roundProjectStatuses) {
          return roundProjectStatusesIpfsResult
        }
        if (pointer === approvedProjectMetadataPointer) {
          return newFormat;
        }
        return {}
      });

      const actualRound = await getRoundById(expectedRoundData.id!, "someChain");

      expect(actualRound).toMatchObject(expectedRound);
    });
  })
})

const convertDateToSecondsString = (date: Date): string => (date.valueOf() / 1000).toString();