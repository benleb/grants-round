/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useRoundById,
  RoundProvider,
} from "../RoundContext";
import { render, screen, waitFor } from "@testing-library/react";
import { makeRoundData } from "../../test-utils";
import { getRoundById } from "../../features/api/round";
import { Round } from "../../features/api/types";

jest.mock("../../features/api/round");
jest.mock("wagmi");
jest.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: jest.fn(),
}));

describe("<ListRoundProvider />", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("useRoundById()", () => {
    it("provides round based on given round id", async () => {
      const expectedRound = makeRoundData();
      const expectedRoundId: string = expectedRound.id;
      (getRoundById as any).mockResolvedValue(expectedRound);

      render(
        <RoundProvider>
          <TestingUseRoundByIdComponent
            expectedRoundId={expectedRoundId}
          />
        </RoundProvider>
      );

      expect(await screen.findByText(expectedRoundId)).toBeInTheDocument();
    });

    it("sets isLoading to true when getRoundById call is in progress", async () => {
      const expectedRound = makeRoundData();
      const expectedRoundId: string = expectedRound.id;
      (getRoundById as any).mockReturnValue(new Promise<Round>(() => {}));

      render(
        <RoundProvider>
          <TestingUseRoundByIdComponent
            expectedRoundId={expectedRoundId}
          />
        </RoundProvider>
      );

      expect(
        await screen.findByTestId("is-loading-round-by-id")
      ).toBeInTheDocument();
    });

    it("sets isLoading back to false and when getRoundById call succeeds", async () => {
      const expectedRound = makeRoundData();
      const expectedRoundId: string = expectedRound.id;
      (getRoundById as any).mockResolvedValue(expectedRound);

      render(
        <RoundProvider>
          <TestingUseRoundByIdComponent
            expectedRoundId={expectedRoundId}
          />
        </RoundProvider>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId("is-loading-round-by-id")
        ).not.toBeInTheDocument();
      });
    });

    it("sets isLoading back to false when getRoundById call fails", async () => {
      const expectedRound = makeRoundData();
      const expectedRoundId: string = expectedRound.id;
      (getRoundById as any).mockRejectedValue(new Error(":("));

      render(
        <RoundProvider>
          <TestingUseRoundByIdComponent
            expectedRoundId={expectedRoundId}
          />
        </RoundProvider>
      );

      await waitFor(() => {
        expect(
          screen.queryByTestId("is-loading-round-by-id")
        ).not.toBeInTheDocument();
      });

      screen.getByTestId("round-by-id-error-msg");
    });
  });
});


const TestingUseRoundByIdComponent = (props: {
  expectedRoundId: string;
}) => {
  const { round, isLoading, getRoundByIdError } = useRoundById(
    "chainID",
    props.expectedRoundId
  );
  return (
    <>
      {round ? <div>{round.id}</div> : <div>No Round Found</div>}

      {isLoading && <div data-testid="is-loading-round-by-id"></div>}

      {getRoundByIdError && <div data-testid="round-by-id-error-msg" />}
    </>
  );
};